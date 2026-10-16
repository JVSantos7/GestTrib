// Números decimais no formato brasileiro, tratados como texto do início ao fim:
// nunca passam por float, então "0,1 + 0,2" não vira 0,30000000000000004.

// Inteiro com ou sem pontos de milhar (1234 ou 1.234), e até 2 casas depois da vírgula.
const DECIMAL_BR = /^(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?$/;

/**
 * Converte "1.234,5" em "1234.50" (formato aceito pelo Prisma/PostgreSQL).
 * Devolve null se o texto não for um número válido no padrão brasileiro.
 */
export function lerDecimalBr(texto: string): string | null {
  const encontrado = DECIMAL_BR.exec(texto.trim());
  if (!encontrado) return null;

  const inteiro = encontrado[1].replace(/\./g, "").replace(/^0+(?=\d)/, "");
  const centavos = (encontrado[2] ?? "").padEnd(2, "0");
  return `${inteiro}.${centavos}`;
}

/** Converte "1234.5" (ou um Decimal do Prisma) em "1.234,50" para exibir. */
export function formatarDecimalBr(valor: { toFixed(casas: number): string } | string): string {
  const texto = typeof valor === "string" ? valor : valor.toFixed(2);
  const [inteiro, fracao = ""] = texto.split(".");
  const comMilhar = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${comMilhar},${fracao.padEnd(2, "0").slice(0, 2)}`;
}

/** Verdadeiro para "0", "0.00", "000.0" etc. */
export function decimalEhZero(valor: string): boolean {
  return /^0+(\.0+)?$/.test(valor);
}
