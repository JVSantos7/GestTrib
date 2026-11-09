import { describe, expect, it } from "vitest";
import { celulaCsv, decimalCsv, gerarCsv, respostaCsv } from "./csv";

describe("celulaCsv", () => {
  it("deixa texto e número simples como estão", () => {
    expect(celulaCsv("Ana Souza")).toBe("Ana Souza");
    expect(celulaCsv(42)).toBe("42");
    expect(celulaCsv(null)).toBe("");
    expect(celulaCsv(undefined)).toBe("");
  });

  it("põe entre aspas o que tem separador, aspas ou quebra de linha", () => {
    expect(celulaCsv("Rua A; casa 2")).toBe('"Rua A; casa 2"');
    expect(celulaCsv('Comércio "Bom Preço"')).toBe('"Comércio ""Bom Preço"""');
    expect(celulaCsv("linha 1\nlinha 2")).toBe('"linha 1\nlinha 2"');
  });

  it("neutraliza o que o Excel leria como fórmula", () => {
    expect(celulaCsv("=HYPERLINK(\"http://x\")")).toBe("\"'=HYPERLINK(\"\"http://x\"\")\"");
    expect(celulaCsv("+55 83")).toBe("'+55 83");
    expect(celulaCsv("-2+3")).toBe("'-2+3");
    expect(celulaCsv("@SOMA(A1)")).toBe("'@SOMA(A1)");
    expect(celulaCsv("\t=1")).toBe("'\t=1");
  });

  it("não mexe em número negativo, que não é fórmula", () => {
    expect(celulaCsv("-15,30")).toBe("-15,30");
    expect(celulaCsv(-3)).toBe("-3");
  });
});

describe("gerarCsv", () => {
  it("começa com o BOM, separa por ponto e vírgula e termina cada linha com CRLF", () => {
    expect(gerarCsv(["Nome", "Valor"], [["José", "10,00"], ["Maria; filha", "2,50"]])).toBe(
      '﻿Nome;Valor\r\nJosé;10,00\r\n"Maria; filha";2,50\r\n',
    );
  });

  it("sem linhas, sai só o cabeçalho", () => {
    expect(gerarCsv(["Nome"], [])).toBe("﻿Nome\r\n");
  });
});

describe("decimalCsv", () => {
  it("usa vírgula decimal, sem ponto de milhar", () => {
    expect(decimalCsv("1234.5")).toBe("1234,50");
    expect(decimalCsv("1234567.89")).toBe("1234567,89");
    expect(decimalCsv("7")).toBe("7,00");
    expect(decimalCsv({ toFixed: () => "0.10" })).toBe("0,10");
  });
});

describe("respostaCsv", () => {
  it("manda baixar o arquivo, sem guardar em cache", async () => {
    const resposta = respostaCsv("relatorio.csv", "﻿a\r\n");
    expect(resposta.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
    expect(resposta.headers.get("Content-Disposition")).toBe('attachment; filename="relatorio.csv"');
    expect(resposta.headers.get("Cache-Control")).toBe("private, no-store");
    // O BOM tem que chegar no arquivo baixado (o Response não pode removê-lo).
    const bytes = new Uint8Array(await resposta.arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
  });
});
