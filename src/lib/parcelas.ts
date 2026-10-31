import DecimalBase from "decimal.js";

// Cópia isolada da biblioteca, como no cálculo do IPTU.
const Decimal = DecimalBase.clone({ precision: 40, rounding: DecimalBase.ROUND_DOWN });

export const MAXIMO_PARCELAS = 10;

export class ParcelamentoInvalidoError extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "ParcelamentoInvalidoError";
  }
}

/**
 * Divide o total em parcelas iguais, sem perder centavos: as parcelas são arredondadas para baixo
 * e a última fica com a diferença (R$ 100,00 em 3 = 33,33 + 33,33 + 33,34).
 */
export function dividirEmParcelas(total: string, quantidade: number): string[] {
  if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > MAXIMO_PARCELAS) {
    throw new ParcelamentoInvalidoError(`Escolha de 1 a ${MAXIMO_PARCELAS} parcelas.`);
  }

  let valor: InstanceType<typeof Decimal>;
  try {
    valor = new Decimal(total);
  } catch {
    throw new ParcelamentoInvalidoError("Valor inválido.");
  }
  if (!valor.isFinite() || valor.lessThanOrEqualTo(0) || !valor.equals(valor.toDecimalPlaces(2))) {
    throw new ParcelamentoInvalidoError("Valor inválido.");
  }

  const parcela = valor.dividedBy(quantidade).toDecimalPlaces(2);
  if (parcela.isZero()) throw new ParcelamentoInvalidoError("O valor é pequeno demais para tantas parcelas.");

  const ultima = valor.minus(parcela.times(quantidade - 1));
  return [...Array<string>(quantidade - 1).fill(parcela.toFixed(2)), ultima.toFixed(2)];
}

const DATA = /^(\d{4})-(\d{2})-(\d{2})$/;

const diasNoMes = (ano: number, mes: number) => new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();

/**
 * Vencimentos mensais a partir do primeiro ("2026-01-31"). Cada mês é contado a partir da primeira
 * data, não da anterior: 31/01 → 28/02 → 31/03. Sem isso, o dia ficaria preso em 28 para sempre.
 */
export function calcularVencimentos(primeiro: string, quantidade: number): string[] {
  const partes = DATA.exec(primeiro);
  if (!partes) throw new ParcelamentoInvalidoError("Data de vencimento inválida.");
  const [ano, mes, dia] = [Number(partes[1]), Number(partes[2]) - 1, Number(partes[3])];
  if (mes > 11 || dia < 1 || dia > diasNoMes(ano, mes)) {
    throw new ParcelamentoInvalidoError("Data de vencimento inválida.");
  }

  return Array.from({ length: quantidade }, (_, indice) => {
    const data = new Date(Date.UTC(ano, mes + indice, 1));
    const diaDoMes = Math.min(dia, diasNoMes(data.getUTCFullYear(), data.getUTCMonth()));
    data.setUTCDate(diaDoMes);
    return data.toISOString().slice(0, 10);
  });
}

export type ParcelaPlanejada = { numero: number; valor: string; vencimento: string };

/** Junta valores e vencimentos: é o plano que a emissão das guias grava. */
export function planejarParcelas(total: string, quantidade: number, primeiroVencimento: string): ParcelaPlanejada[] {
  const valores = dividirEmParcelas(total, quantidade);
  const vencimentos = calcularVencimentos(primeiroVencimento, quantidade);
  return valores.map((valor, indice) => ({ numero: indice + 1, valor, vencimento: vencimentos[indice] }));
}
