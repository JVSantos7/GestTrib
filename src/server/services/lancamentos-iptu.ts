import "server-only";
import { Prisma, type Imovel } from "@/generated/prisma/client";
import { limparDocumento } from "@/lib/documento";
import { calcularIptu, percentualParaFracao } from "@/lib/iptu";
import { calcularPaginacao } from "@/lib/paginacao";
import { LANCAMENTOS_POR_PAGINA, type SituacaoLancamento } from "@/lib/schemas/filtros-lancamentos";
import { ehUuid } from "@/lib/uuid";
import { prisma } from "@/server/db";
import { registrarAuditoria, registrarAuditorias } from "@/server/services/auditoria";
import { ImovelNaoEncontradoError } from "@/server/services/imoveis";
import { ParametrosNaoEncontradosError, SetorSemValorError } from "@/server/services/parametros-iptu";
import type { UsuarioLogado } from "@/server/sessao";

const ENTIDADE = "LancamentoIptu";

export class LancamentoJaExisteError extends Error {
  constructor(exercicio: number) {
    super(`Este imóvel já tem IPTU ${exercicio} vigente. Cancele o lançamento atual para lançar de novo.`);
    this.name = "LancamentoJaExisteError";
  }
}

export class LancamentoNaoEncontradoError extends Error {
  constructor() {
    super("Lançamento não encontrado.");
    this.name = "LancamentoNaoEncontradoError";
  }
}

export class LancamentoJaCanceladoError extends Error {
  constructor() {
    super("Este lançamento já foi cancelado.");
    this.name = "LancamentoJaCanceladoError";
  }
}

type ParametrosComTerrenos = Prisma.ParametroIptuGetPayload<{ include: { valoresTerreno: true } }>;

async function exigirParametros(tx: Prisma.TransactionClient, exercicio: number) {
  // Trava compartilhada até o fim da transação: vários lançamentos podem rodar juntos, mas a edição
  // dos parâmetros (que pede trava exclusiva) espera, e depois enxerga os lançamentos já gravados.
  await tx.$queryRaw`SELECT id FROM parametros_iptu WHERE exercicio = ${exercicio} FOR SHARE`;
  const parametros = await tx.parametroIptu.findUnique({ where: { exercicio }, include: { valoresTerreno: true } });
  if (!parametros) throw new ParametrosNaoEncontradosError();
  return parametros;
}

/** Setor + quadra + lote: unidades com o mesmo prefixo estão no mesmo terreno (prédio). */
const lote = (inscricao: string) => inscricao.slice(0, 9);
const setor = (inscricao: string) => inscricao.slice(0, 2);

/** Valores do exercício que valem para este imóvel: m² do setor e, conforme o uso, m² de construção e alíquota. */
function valoresParaImovel(parametros: ParametrosComTerrenos, imovel: Imovel) {
  const terreno = parametros.valoresTerreno.find((v) => v.setor === setor(imovel.inscricao));
  if (!terreno) throw new SetorSemValorError([setor(imovel.inscricao)]);
  const porUso = {
    RESIDENCIAL: [parametros.aliquotaResidencial, parametros.valorM2Residencial],
    COMERCIAL: [parametros.aliquotaComercial, parametros.valorM2Comercial],
    INDUSTRIAL: [parametros.aliquotaIndustrial, parametros.valorM2Industrial],
    TERRENO: [parametros.aliquotaTerreno, new Prisma.Decimal(0)],
  } as const;
  const [aliquota, valorM2Construcao] = porUso[imovel.uso];
  return { valorM2Terreno: terreno.valor.toFixed(2), valorM2Construcao: valorM2Construcao.toFixed(2), aliquota: aliquota.toFixed(2) };
}

/** Calcula e monta o registro com a fotografia do imóvel, dos parâmetros e da memória de cálculo. */
function montarLancamento(exercicio: number, parametros: ParametrosComTerrenos, imovel: Imovel, unidadesNoLote: number) {
  const valores = valoresParaImovel(parametros, imovel);
  const calculo = calcularIptu(
    { uso: imovel.uso, areaTerreno: imovel.areaTerreno.toFixed(2), areaConstruida: imovel.areaConstruida.toFixed(2), unidadesNoLote },
    { valorM2Terreno: valores.valorM2Terreno, valorM2Construcao: valores.valorM2Construcao, aliquota: percentualParaFracao(valores.aliquota) },
  );
  return {
    exercicio,
    imovelId: imovel.id,
    contribuinteId: imovel.contribuinteId,
    uso: imovel.uso,
    inscricao: imovel.inscricao,
    areaTerreno: imovel.areaTerreno,
    areaConstruida: imovel.areaConstruida,
    unidadesNoLote,
    ...valores,
    areaTerrenoConsiderada: calculo.areaTerrenoConsiderada,
    valorVenalTerreno: calculo.valorVenalTerreno,
    valorVenalConstrucao: calculo.valorVenalConstrucao,
    valorVenal: calculo.valorVenal,
    valorImposto: calculo.valorImposto,
  };
}

const ehDuplicado = (erro: unknown) => erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002";

export async function lancarImovel(imovelId: string, exercicio: number, responsavel: UsuarioLogado) {
  if (!ehUuid(imovelId)) throw new ImovelNaoEncontradoError();
  try {
    return await prisma.$transaction(async (tx) => {
      const parametros = await exigirParametros(tx, exercicio);
      const imovel = await tx.imovel.findFirst({ where: { id: imovelId, excluidoEm: null } });
      if (!imovel) throw new ImovelNaoEncontradoError();
      if (await tx.lancamentoIptu.count({ where: { imovelId, exercicio, vigente: true } })) {
        throw new LancamentoJaExisteError(exercicio);
      }

      const unidades = await tx.imovel.count({ where: { inscricao: { startsWith: lote(imovel.inscricao) }, excluidoEm: null } });
      const lancamento = await tx.lancamentoIptu.create({ data: montarLancamento(exercicio, parametros, imovel, unidades) });
      await registrarAuditoria(tx, { entidade: ENTIDADE, entidadeId: lancamento.id, acao: "CRIACAO", dados: lancamento, responsavel });
      return lancamento;
    });
  } catch (erro) {
    // Dois cliques ao mesmo tempo: os dois passam pela conferência, mas a unique do banco barra o segundo.
    if (ehDuplicado(erro)) throw new LancamentoJaExisteError(exercicio);
    throw erro;
  }
}

/**
 * Lança o IPTU de todos os imóveis ativos que ainda não têm lançamento vigente no exercício.
 * Tudo ou nada: se um imóvel não puder ser calculado, nenhum é lançado.
 */
export async function lancarExercicio(exercicio: number, responsavel: UsuarioLogado) {
  try {
    return await prisma.$transaction(
      async (tx) => {
        const parametros = await exigirParametros(tx, exercicio);
        const imoveis = await tx.imovel.findMany({ where: { excluidoEm: null }, orderBy: { inscricao: "asc" } });
        const jaLancados = new Set(
          (await tx.lancamentoIptu.findMany({ where: { exercicio, vigente: true }, select: { imovelId: true } })).map((l) => l.imovelId),
        );
        const pendentes = imoveis.filter((imovel) => !jaLancados.has(imovel.id));

        // Avisa todos os setores sem valor de uma vez, em vez de um por tentativa.
        const comValor = new Set(parametros.valoresTerreno.map((v) => v.setor));
        const semValor = [...new Set(pendentes.map((i) => setor(i.inscricao)).filter((s) => !comValor.has(s)))].sort();
        if (semValor.length > 0) throw new SetorSemValorError(semValor);

        const unidadesPorLote = new Map<string, number>();
        for (const imovel of imoveis) unidadesPorLote.set(lote(imovel.inscricao), (unidadesPorLote.get(lote(imovel.inscricao)) ?? 0) + 1);

        const lancamentos = await tx.lancamentoIptu.createManyAndReturn({
          data: pendentes.map((imovel) => montarLancamento(exercicio, parametros, imovel, unidadesPorLote.get(lote(imovel.inscricao))!)),
        });
        await registrarAuditorias(
          tx,
          lancamentos.map((lancamento) => ({ entidade: ENTIDADE, entidadeId: lancamento.id, acao: "CRIACAO" as const, dados: lancamento, responsavel })),
        );
        return { lancados: lancamentos.length, jaLancados: jaLancados.size };
      },
      // Muitos imóveis levam mais que os 5 s padrão de uma transação.
      { timeout: 60_000 },
    );
  } catch (erro) {
    if (ehDuplicado(erro)) {
      throw new LancamentoJaExisteError(exercicio);
    }
    throw erro;
  }
}

/** O lançamento não é apagado: deixa de ser vigente e guarda quando e por que foi cancelado. */
export async function cancelarLancamento(id: string, motivo: string, responsavel: UsuarioLogado) {
  if (!ehUuid(id)) throw new LancamentoNaoEncontradoError();
  return prisma.$transaction(async (tx) => {
    const existente = await tx.lancamentoIptu.findUnique({ where: { id } });
    if (!existente) throw new LancamentoNaoEncontradoError();
    if (!existente.vigente) throw new LancamentoJaCanceladoError();

    const lancamento = await tx.lancamentoIptu.update({
      where: { id },
      data: { vigente: null, canceladoEm: new Date(), motivoCancelamento: motivo },
    });
    await registrarAuditoria(tx, {
      entidade: ENTIDADE,
      entidadeId: id,
      acao: "ALTERACAO",
      dados: { campo: "situacao", para: "cancelado", motivo },
      responsavel,
    });
    return lancamento;
  });
}

const CONTRIBUINTE = { select: { id: true, nome: true, documento: true, tipoPessoa: true } };

type OpcoesListagem = {
  busca?: string;
  exercicio?: number;
  situacao?: SituacaoLancamento;
  pagina?: number;
  porPagina?: number;
};

export async function listarLancamentos(opcoes: OpcoesListagem = {}) {
  const { busca = "", exercicio, situacao, pagina = 1, porPagina = LANCAMENTOS_POR_PAGINA } = opcoes;

  const where: Prisma.LancamentoIptuWhereInput = {};
  if (exercicio) where.exercicio = exercicio;
  if (situacao) where.vigente = situacao === "vigente" ? true : null;
  if (busca) {
    // O Prisma não escapa os curingas do LIKE: sem isso, buscar "%" ou "_" traria todos.
    const texto = busca.replace(/[\\%_]/g, "\\$&");
    const digitos = busca.replace(/\D/g, "");
    const documento = limparDocumento(busca);
    where.OR = [
      { contribuinte: { nome: { contains: texto, mode: "insensitive" } } },
      ...(digitos ? [{ inscricao: { contains: digitos } }] : []),
      ...(documento ? [{ contribuinte: { documento: { contains: documento } } }] : []),
    ];
  }

  // Total em reais só dos vigentes: um cancelado não é mais devido.
  const [total, soma] = await Promise.all([
    prisma.lancamentoIptu.count({ where }),
    prisma.lancamentoIptu.aggregate({ where: { AND: [where, { vigente: true }] }, _sum: { valorImposto: true }, _count: true }),
  ]);
  const paginacao = calcularPaginacao(total, pagina, porPagina);
  const itens = await prisma.lancamentoIptu.findMany({
    where,
    include: { contribuinte: CONTRIBUINTE },
    orderBy: [{ exercicio: "desc" }, { inscricao: "asc" }, { criadoEm: "desc" }],
    skip: paginacao.pular,
    take: porPagina,
  });

  return { itens, paginacao, vigentes: { quantidade: soma._count, valor: soma._sum.valorImposto ?? new Prisma.Decimal(0) } };
}

export async function buscarLancamento(id: string) {
  if (!ehUuid(id)) return null;
  return prisma.lancamentoIptu.findUnique({
    where: { id },
    include: {
      contribuinte: CONTRIBUINTE,
      imovel: { select: { id: true, logradouro: true, numero: true, complemento: true, bairro: true, excluidoEm: true } },
    },
  });
}

/** Lançamentos em que o contribuinte é o devedor (o proprietário na data do lançamento). */
export function listarLancamentosDoContribuinte(contribuinteId: string) {
  if (!ehUuid(contribuinteId)) return Promise.resolve([]);
  return prisma.lancamentoIptu.findMany({
    where: { contribuinteId },
    orderBy: [{ exercicio: "desc" }, { inscricao: "asc" }, { criadoEm: "desc" }],
  });
}

/** Quantidade e totais dos lançamentos vigentes de um exercício, por uso do imóvel (a soma é feita no banco). */
export async function resumirExercicio(exercicio: number) {
  const grupos = await prisma.lancamentoIptu.groupBy({
    by: ["uso"],
    where: { exercicio, vigente: true },
    _count: true,
    _sum: { valorVenal: true, valorImposto: true },
    orderBy: { uso: "asc" },
  });
  return grupos.map((grupo) => ({
    uso: grupo.uso,
    quantidade: grupo._count,
    valorVenal: grupo._sum.valorVenal ?? new Prisma.Decimal(0),
    valorImposto: grupo._sum.valorImposto ?? new Prisma.Decimal(0),
  }));
}

/** Lançamentos de um imóvel (vigentes e cancelados), para a página dele. */
export function listarLancamentosDoImovel(imovelId: string) {
  if (!ehUuid(imovelId)) return Promise.resolve([]);
  return prisma.lancamentoIptu.findMany({
    where: { imovelId },
    orderBy: [{ exercicio: "desc" }, { criadoEm: "desc" }],
  });
}
