import "server-only";
import { dataParaIso, hojeIso } from "@/lib/datas";
import { calcularSituacaoFiscal } from "@/lib/situacao-fiscal";
import { ehUuid } from "@/lib/uuid";
import { prisma } from "@/server/db";
import { ATIVAS } from "@/server/services/guias";

/**
 * O que o contribuinte deve hoje, com a classificação da situação fiscal.
 * O devedor é quem era o proprietário na data do lançamento (`contribuinteId` do lançamento),
 * não o dono atual do imóvel: a dívida de um imóvel vendido continua com quem a deixou.
 */
export async function consultarSituacaoFiscal(contribuinteId: string) {
  const hoje = hojeIso();
  if (!ehUuid(contribuinteId)) {
    return { hoje, resumo: calcularSituacaoFiscal([], [], hoje), guias: [], lancamentosAEmitir: [] };
  }

  const [guias, lancamentosAEmitir] = await Promise.all([
    // Guias em aberto de lançamentos vigentes. (Ao cancelar o lançamento, as abertas já são canceladas;
    // o filtro em `vigente` é uma segunda garantia.)
    prisma.guia.findMany({
      where: { situacao: "ABERTA", lancamento: { contribuinteId, vigente: true } },
      select: {
        id: true,
        numero: true,
        parcela: true,
        totalParcelas: true,
        valor: true,
        vencimento: true,
        lancamento: { select: { id: true, exercicio: true, inscricao: true } },
      },
      orderBy: [{ vencimento: "asc" }, { numero: "asc" }],
    }),
    // IPTU vigente que ainda não virou cobrança: nenhuma guia aberta ou paga.
    prisma.lancamentoIptu.findMany({
      where: { contribuinteId, vigente: true, guias: { none: ATIVAS } },
      select: { id: true, exercicio: true, inscricao: true, valorImposto: true },
      orderBy: [{ exercicio: "asc" }, { inscricao: "asc" }],
    }),
  ]);

  const resumo = calcularSituacaoFiscal(
    guias.map((guia) => ({ valor: guia.valor.toFixed(2), vencimento: dataParaIso(guia.vencimento) })),
    lancamentosAEmitir.map((lancamento) => lancamento.valorImposto.toFixed(2)),
    hoje,
  );

  return { hoje, resumo, guias, lancamentosAEmitir };
}

export type ConsultaSituacaoFiscal = Awaited<ReturnType<typeof consultarSituacaoFiscal>>;
