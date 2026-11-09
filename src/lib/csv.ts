// Arquivos CSV para abrir no Excel (ou LibreOffice) configurado em português.
// Funções puras: o Route Handler só monta as linhas e devolve a resposta.

/** Uma célula: texto, número ou vazia. */
export type CelulaCsv = string | number | null | undefined;

// O Excel em pt-BR usa a vírgula como separador decimal, então o separador de colunas é o ponto e vírgula.
const SEPARADOR = ";";
// Fim de linha do padrão CSV (RFC 4180), que o Excel entende em qualquer sistema.
const FIM_DE_LINHA = "\r\n";
// "Byte order mark": avisa ao Excel que o arquivo é UTF-8. Sem ele, "José" aparece como "JosÃ©".
const BOM = "﻿";

// Número puro ("1234,56", "-5", "42"): nunca é fórmula, pode ficar como está.
const NUMERO = /^-?\d+(,\d+)?$/;
// Começos que o Excel interpreta como fórmula. Tab e CR também, porque alguns programas os ignoram
// e leem o caractere seguinte.
const INICIO_DE_FORMULA = /^[=+\-@\t\r]/;

/**
 * Prepara uma célula:
 * - protege contra "CSV injection": um nome cadastrado como `=HYPERLINK(...)` viraria fórmula
 *   ao abrir o arquivo. Com um apóstrofo na frente, o Excel mostra o texto em vez de executar;
 * - coloca entre aspas o que tem separador, aspas ou quebra de linha (e dobra as aspas internas).
 */
export function celulaCsv(valor: CelulaCsv): string {
  if (valor === null || valor === undefined) return "";
  let texto = String(valor);
  if (INICIO_DE_FORMULA.test(texto) && !NUMERO.test(texto)) texto = `'${texto}`;
  if (/[";\r\n]/.test(texto)) texto = `"${texto.replace(/"/g, '""')}"`;
  return texto;
}

/** Monta o arquivo inteiro: BOM, cabeçalho e uma linha por item. */
export function gerarCsv(cabecalho: string[], linhas: CelulaCsv[][]): string {
  const todas = [cabecalho, ...linhas].map((linha) => linha.map(celulaCsv).join(SEPARADOR));
  return BOM + todas.join(FIM_DE_LINHA) + FIM_DE_LINHA;
}

/**
 * Valor monetário para o CSV: "1234.5" (ou um Decimal do Prisma) → "1234,50".
 * Sem ponto de milhar, para o Excel reconhecer como número e deixar somar a coluna.
 */
export function decimalCsv(valor: { toFixed(casas: number): string } | string): string {
  const texto = typeof valor === "string" ? valor : valor.toFixed(2);
  const [inteiro, fracao = ""] = texto.split(".");
  return `${inteiro},${fracao.padEnd(2, "0").slice(0, 2)}`;
}

/** Resposta HTTP que faz o navegador baixar o arquivo com o nome dado. */
export function respostaCsv(nomeArquivo: string, conteudo: string): Response {
  return new Response(conteudo, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      // "attachment": baixar em vez de abrir na aba.
      "Content-Disposition": `attachment; filename="${nomeArquivo}"`,
      // Dados de contribuintes: não fica guardado em cache do navegador nem de proxies.
      "Cache-Control": "private, no-store",
    },
  });
}
