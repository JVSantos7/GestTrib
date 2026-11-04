import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { hojeIso } from "@/lib/datas";
import { planejarParcelas } from "@/lib/parcelas";
import { ehUuid } from "@/lib/uuid";
import { prisma } from "@/server/db";
import { registrarAuditorias } from "@/server/services/auditoria";
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

/** Guias de um lançamento, das ativas para as canceladas e na ordem das parcelas. */
export function listarGuiasDoLancamento(lancamentoId: string) {
  if (!ehUuid(lancamentoId)) return Promise.resolve([]);
  return prisma.guia.findMany({
    where: { lancamentoId },
    orderBy: [{ canceladaEm: { sort: "desc", nulls: "first" } }, { parcela: "asc" }],
  });
}
