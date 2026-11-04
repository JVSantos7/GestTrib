import DecimalBase from "decimal.js";

// Cópia isolada da biblioteca, como no cálculo do IPTU e nas parcelas.
const Decimal = DecimalBase.clone({ precision: 40 });

/**
 * A situação é calculada na hora, nunca gravada: uma guia que vence hoje fica vencida amanhã
 * sem que nada mude no banco. Uma coluna "situação" ficaria errada toda meia-noite.
 */
export const SITUACOES_FISCAIS = ["REGULAR", "A_VENCER", "IRREGULAR"] as const;
export type SituacaoFiscal = (typeof SITUACOES_FISCAIS)[number];

export const ROTULOS_SITUACAO_FISCAL: Record<SituacaoFiscal, string> = {
  REGULAR: "Regular",
  A_VENCER: "Regular, com débitos a vencer",
  IRREGULAR: "Irregular",
};

/** Guia em aberto (situação ABERTA no banco). Valor em texto decimal ("123.45"), vencimento ISO. */
export type GuiaEmAberto = { valor: string; vencimento: string };

export type ResumoSituacaoFiscal = {
  situacao: SituacaoFiscal;
  /** Guias abertas com vencimento já passado. */
  vencido: string;
  quantidadeVencidas: number;
  /** Guias abertas ainda no prazo (inclui as que vencem hoje). */
  aVencer: string;
  quantidadeAVencer: number;
  /** IPTU vigente que ainda não tem guia emitida: é devido, mas ainda não foi cobrado. */
  aEmitir: string;
  quantidadeAEmitir: number;
  totalEmAberto: string;
};

/**
 * Classifica o contribuinte a partir do que ele deve, em valores originais (sem juros nem multa).
 * - Irregular: ao menos uma guia vencida.
 * - Regular, com débitos a vencer: algo em aberto, nada vencido.
 * - Regular: nada em aberto.
 */
export function calcularSituacaoFiscal(
  guiasEmAberto: GuiaEmAberto[],
  valoresAEmitir: string[],
  hoje: string,
): ResumoSituacaoFiscal {
  let vencido = new Decimal(0);
  let aVencer = new Decimal(0);
  let quantidadeVencidas = 0;

  for (const guia of guiasEmAberto) {
    // Mesma regra de `situacaoExibida`: no dia do vencimento ainda pode pagar.
    if (guia.vencimento < hoje) {
      vencido = vencido.plus(guia.valor);
      quantidadeVencidas++;
    } else {
      aVencer = aVencer.plus(guia.valor);
    }
  }
  const aEmitir = valoresAEmitir.reduce((total, valor) => total.plus(valor), new Decimal(0));
  const totalEmAberto = vencido.plus(aVencer).plus(aEmitir);

  const situacao: SituacaoFiscal =
    quantidadeVencidas > 0 ? "IRREGULAR" : totalEmAberto.greaterThan(0) ? "A_VENCER" : "REGULAR";

  return {
    situacao,
    vencido: vencido.toFixed(2),
    quantidadeVencidas,
    aVencer: aVencer.toFixed(2),
    quantidadeAVencer: guiasEmAberto.length - quantidadeVencidas,
    aEmitir: aEmitir.toFixed(2),
    quantidadeAEmitir: valoresAEmitir.length,
    totalEmAberto: totalEmAberto.toFixed(2),
  };
}
