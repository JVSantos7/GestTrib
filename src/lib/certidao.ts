import type { SituacaoFiscal } from "@/lib/situacao-fiscal";

/**
 * Tipos de certidão do Código Tributário Nacional:
 * - art. 205: a certidão negativa prova que não há débitos;
 * - art. 206: havendo só débitos ainda não vencidos, a certidão é positiva,
 *   mas tem os mesmos efeitos da negativa (o contribuinte não está em atraso).
 */
export const TIPOS_CERTIDAO = ["NEGATIVA", "POSITIVA_EFEITO_NEGATIVA", "POSITIVA"] as const;
export type TipoCertidao = (typeof TIPOS_CERTIDAO)[number];

export const TITULOS_CERTIDAO: Record<TipoCertidao, string> = {
  NEGATIVA: "Certidão Negativa de Débitos",
  POSITIVA_EFEITO_NEGATIVA: "Certidão Positiva de Débitos com Efeitos de Negativa",
  POSITIVA: "Certidão Positiva de Débitos",
};

const TIPO_POR_SITUACAO: Record<SituacaoFiscal, TipoCertidao> = {
  REGULAR: "NEGATIVA",
  A_VENCER: "POSITIVA_EFEITO_NEGATIVA",
  IRREGULAR: "POSITIVA",
};

export function tipoCertidao(situacao: SituacaoFiscal): TipoCertidao {
  return TIPO_POR_SITUACAO[situacao];
}

export const VALIDADE_CERTIDAO_DIAS = 30;

/** Último dia em que a certidão vale: emitida em 04/11, vale até 04/12 (30 dias depois). */
export function calcularValidade(emissao: string, dias: number = VALIDADE_CERTIDAO_DIAS): string {
  const [ano, mes, dia] = emissao.split("-").map(Number);
  // Date.UTC resolve a virada de mês e de ano (31/01 + 30 dias = 02/03) sem depender do fuso.
  return new Date(Date.UTC(ano, mes - 1, dia + dias)).toISOString().slice(0, 10);
}

/** Válida até o fim do dia da validade, inclusive (datas ISO se comparam como texto). */
export function certidaoValida(validade: string, hoje: string): boolean {
  return hoje <= validade;
}

/** 42 emitida em 2026 → "000042/2026". */
export function formatarNumeroCertidao(numero: number, ano: number): string {
  return `${String(numero).padStart(6, "0")}/${ano}`;
}

// ---------------------------------------------------------------------------
// Código de validação: quem recebe a certidão confere a autenticidade por ele.
// ---------------------------------------------------------------------------

// 32 símbolos, sem I, O, 0 e 1 (fáceis de confundir quando alguém digita o código lido no papel).
// Com 32 símbolos, cada um vale exatamente 5 bits: 16 símbolos = 80 bits, impossível de adivinhar.
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const TAMANHO_CODIGO = 16;

/**
 * Gera um código como "K7QM-3XRA-PW9D-HB2T". Os bytes aleatórios podem ser passados
 * nos testes; em uso normal vêm do gerador criptográfico (não do Math.random, que é previsível).
 */
export function gerarCodigoValidacao(bytes: Uint8Array = crypto.getRandomValues(new Uint8Array(TAMANHO_CODIGO))): string {
  if (bytes.length !== TAMANHO_CODIGO) throw new Error(`São necessários ${TAMANHO_CODIGO} bytes.`);
  // 256 é múltiplo de 32, então o resto da divisão distribui os símbolos por igual (sem viés).
  const simbolos = Array.from(bytes, (byte) => ALFABETO[byte % ALFABETO.length]).join("");
  return formatarCodigo(simbolos);
}

function formatarCodigo(simbolos: string): string {
  return simbolos.match(/.{4}/g)!.join("-");
}

/**
 * Aceita o código como a pessoa digitar (minúsculas, sem hífens, com espaços) e devolve
 * no formato gravado no banco, ou null se não puder ser um código válido.
 */
export function normalizarCodigoValidacao(texto: string): string | null {
  const simbolos = texto.toUpperCase().replace(/[\s-]/g, "");
  if (simbolos.length !== TAMANHO_CODIGO) return null;
  for (const simbolo of simbolos) {
    if (!ALFABETO.includes(simbolo)) return null;
  }
  return formatarCodigo(simbolos);
}
