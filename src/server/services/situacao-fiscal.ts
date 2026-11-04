import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { dataParaIso, hojeIso } from "@/lib/datas";
import { calcularSituacaoFiscal, type SituacaoFiscal } from "@/lib/situacao-fiscal";
import { ehUuid } from "@/lib/uuid";
import { prisma } from "@/server/db";
import { ATIVAS } from "@/server/services/guias";

/**
 * O que o contribuinte deve hoje, com a classificação da situação fiscal.
 * O devedor é quem era o proprietário na data do lançamento (`contribuinteId` do lançamento),
 * não o dono atual do imóvel: a dívida de um imóvel vendido continua com quem a deixou.
 */
export async function consultarSituacaoFiscal(contribuinteId: string, db: Prisma.TransactionClient = prisma) {
  const hoje = hojeIso();
  if (!ehUuid(contribuinteId)) {
    return { hoje, resumo: calcularSituacaoFiscal([], [], hoje), guias: [], lancamentosAEmitir: [] };
  }

  // `db` permite rodar a consulta dentro de uma transação (ex.: na emissão da certidão).
  const [guias, lancamentosAEmitir] = await Promise.all([
    // Guias em aberto de lançamentos vigentes. (Ao cancelar o lançamento, as abertas já são canceladas;
    // o filtro em `vigente` é uma segunda garantia.)
    db.guia.findMany({
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
    db.lancamentoIptu.findMany({
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

/**
 * A mesma regra de `calcularSituacaoFiscal`, escrita como filtro do banco, para a listagem:
 * filtrar na memória obrigaria a carregar todos os contribuintes antes de paginar.
 * Se a regra mudar, as duas versões mudam juntas.
 */
export function filtroSituacaoFiscal(situacao: SituacaoFiscal, hoje: string = hojeIso()): Prisma.ContribuinteWhereInput {
  // Um lançamento com débito vencido: alguma guia aberta cujo vencimento já passou.
  const comVencido: Prisma.LancamentoIptuWhereInput = {
    vigente: true,
    guias: { some: { situacao: "ABERTA", vencimento: { lt: new Date(`${hoje}T00:00:00Z`) } } },
  };
  // Um lançamento com algo em aberto: guia aberta, ou nenhuma guia emitida ainda.
  const emAberto: Prisma.LancamentoIptuWhereInput = {
    vigente: true,
    OR: [{ guias: { some: { situacao: "ABERTA" } } }, { guias: { none: ATIVAS } }],
  };

  switch (situacao) {
    case "IRREGULAR":
      return { lancamentosIptu: { some: comVencido } };
    case "A_VENCER":
      return { lancamentosIptu: { some: emAberto, none: comVencido } };
    case "REGULAR":
      return { lancamentosIptu: { none: emAberto } };
  }
}
