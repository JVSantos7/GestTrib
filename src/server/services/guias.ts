import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { hojeIso } from "@/lib/datas";
import { formatarReais } from "@/lib/decimal";
import { limparDocumento } from "@/lib/documento";
import { calcularPaginacao } from "@/lib/paginacao";
import { planejarParcelas } from "@/lib/parcelas";
import { GUIAS_POR_PAGINA, type SituacaoFiltroGuia } from "@/lib/schemas/filtros-guias";
import { ehUuid } from "@/lib/uuid";
import { prisma } from "@/server/db";
import { registrarAuditoria, registrarAuditorias } from "@/server/services/auditoria";
import type { UsuarioLogado } from "@/server/sessao";

const ENTIDADE = "Guia";

export class LancamentoNaoVigenteError extends Error {
  constructor() {
    super("Só é possível emitir guias de um lançamento vigente.");
    this.name = "LancamentoNaoVigenteError";
  }
}

export class GuiasJaEmitidasError extends Error {
  constructor() {
    super("Este lançamento já tem guias emitidas.");
    this.name = "GuiasJaEmitidasError";
  }
}

export class VencimentoNoPassadoError extends Error {
  constructor() {
    super("O primeiro vencimento não pode ser anterior a hoje.");
    this.name = "VencimentoNoPassadoError";
  }
}

export type DadosEmissao = { quantidade: number; primeiroVencimento: string };

/** Guias que ainda contam: abertas ou pagas. Canceladas ficam só no histórico. */
const ATIVAS = { situacao: { in: ["ABERTA", "PAGA"] } } satisfies Prisma.GuiaWhereInput;

export async function emitirGuias(lancamentoId: string, dados: DadosEmissao, responsavel: UsuarioLogado) {
  if (!ehUuid(lancamentoId)) throw new LancamentoNaoVigenteError();
  if (dados.primeiroVencimento < hojeIso()) throw new VencimentoNoPassadoError();

  return prisma.$transaction(async (tx) => {
    // Trava a linha do lançamento até o fim da transação: um segundo clique simultâneo espera
    // e, quando passa, já enxerga as guias criadas pelo primeiro.
    await tx.$queryRaw`SELECT id FROM lancamentos_iptu WHERE id = ${lancamentoId}::uuid FOR UPDATE`;
    const lancamento = await tx.lancamentoIptu.findUnique({ where: { id: lancamentoId } });
    if (!lancamento?.vigente) throw new LancamentoNaoVigenteError();
    if (await tx.guia.count({ where: { lancamentoId, ...ATIVAS } })) throw new GuiasJaEmitidasError();

    const parcelas = planejarParcelas(lancamento.valorImposto.toFixed(2), dados.quantidade, dados.primeiroVencimento);
    const guias = await tx.guia.createManyAndReturn({
      data: parcelas.map((p) => ({
        lancamentoId,
        parcela: p.numero,
        totalParcelas: parcelas.length,
        valor: p.valor,
        vencimento: new Date(`${p.vencimento}T00:00:00Z`),
      })),
    });
    await registrarAuditorias(
      tx,
      guias.map((guia) => ({ entidade: ENTIDADE, entidadeId: guia.id, acao: "CRIACAO" as const, dados: guia, responsavel })),
    );
    return guias;
  });
}

export class GuiaNaoEncontradaError extends Error {
  constructor() {
    super("Guia não encontrada.");
    this.name = "GuiaNaoEncontradaError";
  }
}

export class GuiaNaoPagavelError extends Error {
  constructor(situacao: "PAGA" | "CANCELADA") {
    super(situacao === "PAGA" ? "Esta guia já está paga." : "Esta guia foi cancelada e não pode ser paga.");
    this.name = "GuiaNaoPagavelError";
  }
}

export class ValorDivergenteError extends Error {
  constructor(pago: string, devido: string) {
    super(`O valor pago (${formatarReais(pago)}) é diferente do valor da guia (${formatarReais(devido)}).`);
    this.name = "ValorDivergenteError";
  }
}

export class DataPagamentoInvalidaError extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "DataPagamentoInvalidaError";
  }
}

export type DadosPagamento = { dataPagamento: string; valorPago: string };

/**
 * Baixa: grava o pagamento e marca a guia como paga, na mesma transação.
 * Sem multa e juros nesta fase, o valor pago precisa ser exatamente o da guia.
 */
export async function registrarPagamento(guiaId: string, dados: DadosPagamento, responsavel: UsuarioLogado) {
  if (!ehUuid(guiaId)) throw new GuiaNaoEncontradaError();
  if (dados.dataPagamento > hojeIso()) throw new DataPagamentoInvalidaError("A data do pagamento não pode estar no futuro.");

  try {
    return await prisma.$transaction(async (tx) => {
      // Trava a guia: duas baixas simultâneas da mesma guia viram uma de cada vez.
      await tx.$queryRaw`SELECT id FROM guias WHERE id = ${guiaId}::uuid FOR UPDATE`;
      const guia = await tx.guia.findUnique({ where: { id: guiaId } });
      if (!guia) throw new GuiaNaoEncontradaError();
      if (guia.situacao !== "ABERTA") throw new GuiaNaoPagavelError(guia.situacao);
      if (dados.dataPagamento < hojeIso(guia.criadoEm)) {
        throw new DataPagamentoInvalidaError("A data do pagamento não pode ser anterior à emissão da guia.");
      }
      // Os dois lados são texto com 2 casas ("600.00"): comparar texto é comparar o valor exato.
      if (dados.valorPago !== guia.valor.toFixed(2)) throw new ValorDivergenteError(dados.valorPago, guia.valor.toFixed(2));

      const pagamento = await tx.pagamento.create({
        data: { guiaId, dataPagamento: new Date(`${dados.dataPagamento}T00:00:00Z`), valorPago: dados.valorPago },
      });
      await tx.guia.update({ where: { id: guiaId }, data: { situacao: "PAGA" } });
      await registrarAuditoria(tx, {
        entidade: ENTIDADE,
        entidadeId: guiaId,
        acao: "ALTERACAO",
        dados: { campo: "situacao", para: "paga", dataPagamento: dados.dataPagamento, valorPago: dados.valorPago },
        responsavel,
      });
      return pagamento;
    });
  } catch (erro) {
    // Rede de segurança: a unique (guia, vigente) barra um segundo pagamento vigente.
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") throw new GuiaNaoPagavelError("PAGA");
    throw erro;
  }
}

export class GuiaNaoPagaError extends Error {
  constructor() {
    super("Só é possível estornar o pagamento de uma guia paga.");
    this.name = "GuiaNaoPagaError";
  }
}

/**
 * Desfaz uma baixa registrada por engano. Nada é apagado: o pagamento fica marcado como estornado,
 * com data e motivo, e a guia volta a ficar aberta (ou vencida, se a data já passou).
 */
export async function estornarPagamento(guiaId: string, motivo: string, responsavel: UsuarioLogado) {
  if (!ehUuid(guiaId)) throw new GuiaNaoEncontradaError();
  return prisma.$transaction(async (tx) => {
    // Mesma trava da baixa: estorno e nova baixa da mesma guia não se cruzam.
    await tx.$queryRaw`SELECT id FROM guias WHERE id = ${guiaId}::uuid FOR UPDATE`;
    const guia = await tx.guia.findUnique({ where: { id: guiaId } });
    if (!guia) throw new GuiaNaoEncontradaError();
    const pagamento = await tx.pagamento.findFirst({ where: { guiaId, vigente: true } });
    if (guia.situacao !== "PAGA" || !pagamento) throw new GuiaNaoPagaError();

    await tx.pagamento.update({
      where: { id: pagamento.id },
      data: { vigente: null, estornadoEm: new Date(), motivoEstorno: motivo },
    });
    await tx.guia.update({ where: { id: guiaId }, data: { situacao: "ABERTA" } });
    await registrarAuditoria(tx, {
      entidade: ENTIDADE,
      entidadeId: guiaId,
      acao: "ALTERACAO",
      dados: {
        campo: "situacao",
        para: "estornada",
        motivo,
        dataPagamento: pagamento.dataPagamento,
        valorPago: pagamento.valorPago,
      },
      responsavel,
    });
  });
}

type OpcoesListagem = {
  busca?: string;
  situacao?: SituacaoFiltroGuia;
  vencimentoDe?: string;
  vencimentoAte?: string;
  pagina?: number;
  porPagina?: number;
};

const dataDoBanco = (iso: string) => new Date(`${iso}T00:00:00Z`);

/** "Vencida" e "aberta" são a mesma situação no banco, separadas pela data de hoje. */
function filtroDeSituacao(situacao: SituacaoFiltroGuia, hoje: Date): Prisma.GuiaWhereInput {
  switch (situacao) {
    case "aberta":
      return { situacao: "ABERTA", vencimento: { gte: hoje } };
    case "vencida":
      return { situacao: "ABERTA", vencimento: { lt: hoje } };
    case "paga":
      return { situacao: "PAGA" };
    case "cancelada":
      return { situacao: "CANCELADA" };
  }
}

export async function listarGuias(opcoes: OpcoesListagem = {}) {
  const { busca = "", situacao, vencimentoDe, vencimentoAte, pagina = 1, porPagina = GUIAS_POR_PAGINA } = opcoes;

  const condicoes: Prisma.GuiaWhereInput[] = [];
  if (situacao) condicoes.push(filtroDeSituacao(situacao, dataDoBanco(hojeIso())));
  if (vencimentoDe) condicoes.push({ vencimento: { gte: dataDoBanco(vencimentoDe) } });
  if (vencimentoAte) condicoes.push({ vencimento: { lte: dataDoBanco(vencimentoAte) } });
  if (busca) {
    // O mesmo termo procura no número da guia, na inscrição e no contribuinte (nome ou documento).
    // O Prisma não escapa os curingas do LIKE: sem isso, buscar "%" ou "_" traria todos.
    if (/^\d{1,8}$/.test(busca)) {
      // Só dígitos, até 8 (como o "00000012" impresso na guia): é o número da guia. Sem isso, "12"
      // também traria toda inscrição ou CPF que contém "12". Inscrição e CPF se buscam com pontuação.
      condicoes.push({ numero: Number(busca) });
    } else {
      const texto = busca.replace(/[\\%_]/g, "\\$&");
      const digitos = busca.replace(/\D/g, "");
      const documento = limparDocumento(busca);
      condicoes.push({
        OR: [
          { lancamento: { contribuinte: { nome: { contains: texto, mode: "insensitive" } } } },
          ...(digitos ? [{ lancamento: { inscricao: { contains: digitos } } }] : []),
          ...(documento ? [{ lancamento: { contribuinte: { documento: { contains: documento } } } }] : []),
        ],
      });
    }
  }
  const where: Prisma.GuiaWhereInput = { AND: condicoes };

  // Quanto da seleção ainda está por receber (abertas e vencidas); pagas e canceladas não entram.
  const [total, emAberto] = await Promise.all([
    prisma.guia.count({ where }),
    prisma.guia.aggregate({ where: { AND: [where, { situacao: "ABERTA" }] }, _sum: { valor: true }, _count: true }),
  ]);
  const paginacao = calcularPaginacao(total, pagina, porPagina);
  const itens = await prisma.guia.findMany({
    where,
    include: { lancamento: { select: { exercicio: true, inscricao: true, contribuinte: { select: { id: true, nome: true, documento: true } } } } },
    orderBy: [{ vencimento: "asc" }, { numero: "asc" }],
    skip: paginacao.pular,
    take: porPagina,
  });

  return {
    itens,
    paginacao,
    emAberto: { quantidade: emAberto._count, valor: emAberto._sum.valor ?? new Prisma.Decimal(0) },
  };
}

export async function buscarGuia(id: string) {
  if (!ehUuid(id)) return null;
  return prisma.guia.findUnique({
    where: { id },
    include: {
      lancamento: {
        include: {
          contribuinte: { select: { id: true, nome: true, documento: true, tipoPessoa: true } },
          imovel: { select: { id: true, logradouro: true, numero: true, complemento: true, bairro: true, cep: true } },
        },
      },
      pagamentos: { orderBy: { criadoEm: "desc" } },
    },
  });
}

/** Guias de um lançamento, das ativas para as canceladas e na ordem das parcelas. */
export function listarGuiasDoLancamento(lancamentoId: string) {
  if (!ehUuid(lancamentoId)) return Promise.resolve([]);
  return prisma.guia.findMany({
    where: { lancamentoId },
    orderBy: [{ canceladaEm: { sort: "desc", nulls: "first" } }, { parcela: "asc" }],
  });
}
