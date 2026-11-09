import DecimalBase from "decimal.js";
import { USOS_IMOVEL, type UsoImovel } from "@/lib/schemas/imovel";

// Cópia isolada da biblioteca, como no cálculo do IPTU e nas parcelas.
const Decimal = DecimalBase.clone({ precision: 40 });

// Valores entram e saem como texto decimal ("1234.50"), igual ao resto do sistema:
// a conta é feita com decimal.js, nunca com float.

/** Soma valores em texto decimal. */
export function somarValores(valores: string[]): string {
  return valores.reduce((total, valor) => total.plus(valor), new Decimal(0)).toFixed(2);
}

/** Quanto `parte` representa de `total`, em percentual com 1 casa ("45.3"). Total zero dá "0.0". */
export function calcularPercentual(parte: string, total: string): string {
  const base = new Decimal(total);
  if (base.isZero()) return "0.0";
  return new Decimal(parte).dividedBy(base).times(100).toFixed(1, Decimal.ROUND_HALF_UP);
}

/** "45.3" → "45,3%". */
export function formatarPercentual(percentual: string): string {
  return `${percentual.replace(".", ",")}%`;
}

// ---------------------------------------------------------------------------
// Inadimplência: guias vencidas agrupadas por contribuinte
// ---------------------------------------------------------------------------

export type GuiaVencida = {
  contribuinteId: string;
  nome: string;
  documento: string;
  valor: string;
  /** ISO "2026-03-10". */
  vencimento: string;
};

export type Devedor = {
  contribuinteId: string;
  nome: string;
  documento: string;
  quantidadeGuias: number;
  /** Vencimento mais antigo entre as guias vencidas: há quanto tempo a dívida existe. */
  vencimentoMaisAntigo: string;
  total: string;
};

export type ResumoInadimplencia = { devedores: Devedor[]; quantidadeGuias: number; total: string };

/**
 * Junta as guias vencidas por contribuinte, do maior devedor para o menor
 * (em caso de empate, por nome). É o que se cobra primeiro.
 */
export function agruparDevedores(guias: GuiaVencida[]): ResumoInadimplencia {
  const porContribuinte = new Map<string, { devedor: Devedor; total: DecimalBase }>();

  for (const guia of guias) {
    const atual = porContribuinte.get(guia.contribuinteId);
    if (!atual) {
      porContribuinte.set(guia.contribuinteId, {
        devedor: {
          contribuinteId: guia.contribuinteId,
          nome: guia.nome,
          documento: guia.documento,
          quantidadeGuias: 1,
          vencimentoMaisAntigo: guia.vencimento,
          total: "",
        },
        total: new Decimal(guia.valor),
      });
      continue;
    }
    atual.devedor.quantidadeGuias++;
    // Datas ISO comparam certo como texto ("2025-12-10" < "2026-01-05").
    if (guia.vencimento < atual.devedor.vencimentoMaisAntigo) atual.devedor.vencimentoMaisAntigo = guia.vencimento;
    atual.total = atual.total.plus(guia.valor);
  }

  const grupos = [...porContribuinte.values()].sort(
    (a, b) => b.total.comparedTo(a.total) || a.devedor.nome.localeCompare(b.devedor.nome, "pt-BR"),
  );

  return {
    devedores: grupos.map(({ devedor, total }) => ({ ...devedor, total: total.toFixed(2) })),
    quantidadeGuias: guias.length,
    total: somarValores(guias.map((guia) => guia.valor)),
  };
}

// ---------------------------------------------------------------------------
// Lançamentos de um exercício: lançado x arrecadado, por uso do imóvel
// ---------------------------------------------------------------------------

export type LancamentoParaResumo = {
  uso: UsoImovel;
  valorImposto: string;
  /** Valores das guias pagas deste lançamento. */
  valoresPagos: string[];
};

export type TotaisLancamentos = {
  quantidade: number;
  lancado: string;
  arrecadado: string;
  /** O que falta receber: guias em aberto e IPTU ainda sem guia emitida. */
  aReceber: string;
  percentualArrecadado: string;
};

export type LinhaLancamentos = TotaisLancamentos & { uso: UsoImovel };

function totalizar(lancamentos: LancamentoParaResumo[]): TotaisLancamentos {
  const lancado = somarValores(lancamentos.map((lancamento) => lancamento.valorImposto));
  const arrecadado = somarValores(lancamentos.flatMap((lancamento) => lancamento.valoresPagos));
  return {
    quantidade: lancamentos.length,
    lancado,
    arrecadado,
    aReceber: new Decimal(lancado).minus(arrecadado).toFixed(2),
    percentualArrecadado: calcularPercentual(arrecadado, lancado),
  };
}

/** Uma linha por uso que tem lançamentos (na ordem do cadastro de imóveis) e o total geral. */
export function resumirLancamentosPorUso(lancamentos: LancamentoParaResumo[]): {
  linhas: LinhaLancamentos[];
  total: TotaisLancamentos;
} {
  const linhas = USOS_IMOVEL.map((uso) => ({ uso, doUso: lancamentos.filter((lancamento) => lancamento.uso === uso) }))
    .filter(({ doUso }) => doUso.length > 0)
    .map(({ uso, doUso }) => ({ uso, ...totalizar(doUso) }));
  return { linhas, total: totalizar(lancamentos) };
}
