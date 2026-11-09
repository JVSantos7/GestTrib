import "server-only";
import { dataParaIso, hojeIso } from "@/lib/datas";
import { agruparDevedores, resumirLancamentosPorUso, somarValores } from "@/lib/relatorios";
import type { FiltrosArrecadacao } from "@/lib/schemas/filtros-relatorios";
import { prisma } from "@/server/db";

// Relatórios só leem: não há transação nem auditoria, porque nada é alterado.

const dataDoBanco = (iso: string) => new Date(`${iso}T00:00:00Z`);

// ---------------------------------------------------------------------------
// Arrecadação
// ---------------------------------------------------------------------------

/** Pagamentos que valem (sem os estornados) com data de pagamento dentro do período. */
function filtroPeriodo({ de, ate }: FiltrosArrecadacao) {
  return { vigente: true, dataPagamento: { gte: dataDoBanco(de), lte: dataDoBanco(ate) } };
}

/**
 * Total arrecadado por dia de pagamento. Conta pela data em que o contribuinte pagou,
 * não pela data em que a baixa foi registrada: é quando o dinheiro entrou.
 * A soma por dia é feita no banco; o total geral, com decimal.js sobre esses dias.
 */
export async function relatorioArrecadacao(filtros: FiltrosArrecadacao) {
  const grupos = await prisma.pagamento.groupBy({
    by: ["dataPagamento"],
    where: filtroPeriodo(filtros),
    _count: true,
    _sum: { valorPago: true },
    orderBy: { dataPagamento: "asc" },
  });
  const dias = grupos.map((grupo) => ({
    data: dataParaIso(grupo.dataPagamento),
    quantidade: grupo._count,
    valor: (grupo._sum.valorPago ?? 0).toFixed(2),
  }));
  return {
    dias,
    quantidade: dias.reduce((soma, dia) => soma + dia.quantidade, 0),
    total: somarValores(dias.map((dia) => dia.valor)),
  };
}

/** Um pagamento por linha, para o CSV (o Excel é que vai agrupar como quiser). */
export function listarPagamentosDoPeriodo(filtros: FiltrosArrecadacao) {
  return prisma.pagamento.findMany({
    where: filtroPeriodo(filtros),
    select: {
      dataPagamento: true,
      valorPago: true,
      guia: {
        select: {
          numero: true,
          parcela: true,
          totalParcelas: true,
          lancamento: { select: { exercicio: true, inscricao: true, contribuinte: { select: { nome: true, documento: true } } } },
        },
      },
    },
    orderBy: [{ dataPagamento: "asc" }, { criadoEm: "asc" }],
  });
}

// ---------------------------------------------------------------------------
// Inadimplência
// ---------------------------------------------------------------------------

/**
 * Guias vencidas e não pagas, agrupadas por devedor (quem era o proprietário no lançamento,
 * como na situação fiscal). Valores originais, sem juros nem multa.
 */
export async function relatorioInadimplencia({ exercicio }: { exercicio?: number }) {
  const hoje = hojeIso();
  const guias = await prisma.guia.findMany({
    where: {
      situacao: "ABERTA",
      // No dia do vencimento ainda pode pagar: vencida é só a partir do dia seguinte.
      vencimento: { lt: dataDoBanco(hoje) },
      lancamento: { vigente: true, ...(exercicio ? { exercicio } : {}) },
    },
    select: {
      valor: true,
      vencimento: true,
      lancamento: { select: { contribuinte: { select: { id: true, nome: true, documento: true } } } },
    },
  });

  const resumo = agruparDevedores(
    guias.map((guia) => ({
      contribuinteId: guia.lancamento.contribuinte.id,
      nome: guia.lancamento.contribuinte.nome,
      documento: guia.lancamento.contribuinte.documento,
      valor: guia.valor.toFixed(2),
      vencimento: dataParaIso(guia.vencimento),
    })),
  );
  return { hoje, ...resumo };
}

// ---------------------------------------------------------------------------
// Lançamentos por exercício
// ---------------------------------------------------------------------------

/** Exercícios que têm lançamentos vigentes, do mais recente para o mais antigo. */
export async function listarExerciciosLancados(): Promise<number[]> {
  const grupos = await prisma.lancamentoIptu.groupBy({
    by: ["exercicio"],
    where: { vigente: true },
    orderBy: { exercicio: "desc" },
  });
  return grupos.map((grupo) => grupo.exercicio);
}

/** Lançado x arrecadado no exercício, por uso do imóvel. */
export async function relatorioLancamentos(exercicio: number) {
  const lancamentos = await prisma.lancamentoIptu.findMany({
    where: { exercicio, vigente: true },
    select: { uso: true, valorImposto: true, guias: { where: { situacao: "PAGA" }, select: { valor: true } } },
  });
  return resumirLancamentosPorUso(
    lancamentos.map((lancamento) => ({
      uso: lancamento.uso,
      valorImposto: lancamento.valorImposto.toFixed(2),
      valoresPagos: lancamento.guias.map((guia) => guia.valor.toFixed(2)),
    })),
  );
}
