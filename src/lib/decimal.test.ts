import { describe, expect, it } from "vitest";
import { decimalEhZero, formatarDecimalBr, lerDecimalBr } from "./decimal";

describe("lerDecimalBr", () => {
  it("lê inteiros, com e sem pontos de milhar", () => {
    expect(lerDecimalBr("360")).toBe("360.00");
    expect(lerDecimalBr("1234")).toBe("1234.00");
    expect(lerDecimalBr("1.234")).toBe("1234.00");
    expect(lerDecimalBr("1.234.567")).toBe("1234567.00");
  });

  it("lê decimais com vírgula, completando as casas", () => {
    expect(lerDecimalBr("1.234,56")).toBe("1234.56");
    expect(lerDecimalBr("1234,5")).toBe("1234.50");
    expect(lerDecimalBr("0,75")).toBe("0.75");
    expect(lerDecimalBr("  12,30 ")).toBe("12.30");
  });

  it("remove zeros à esquerda sem apagar o zero sozinho", () => {
    expect(lerDecimalBr("007,5")).toBe("7.50");
    expect(lerDecimalBr("0")).toBe("0.00");
    expect(lerDecimalBr("000")).toBe("0.00");
  });

  it("rejeita ponto como separador decimal", () => {
    // "1234.5" é ambíguo no Brasil; o ponto só vale como milhar em grupos de 3.
    expect(lerDecimalBr("1234.5")).toBeNull();
    expect(lerDecimalBr("12.34")).toBeNull();
  });

  it("rejeita mais de 2 casas, sinais, letras e vazio", () => {
    expect(lerDecimalBr("1,234")).toBeNull();
    expect(lerDecimalBr("-10")).toBeNull();
    expect(lerDecimalBr("10m²")).toBeNull();
    expect(lerDecimalBr(",5")).toBeNull();
    expect(lerDecimalBr("10,")).toBeNull();
    expect(lerDecimalBr("")).toBeNull();
  });
});

describe("formatarDecimalBr", () => {
  it("formata texto decimal com milhar e 2 casas", () => {
    expect(formatarDecimalBr("1234567.5")).toBe("1.234.567,50");
    expect(formatarDecimalBr("360")).toBe("360,00");
    expect(formatarDecimalBr("0.75")).toBe("0,75");
  });

  it("aceita objetos com toFixed, como o Decimal do Prisma", () => {
    expect(formatarDecimalBr({ toFixed: () => "1234.56" })).toBe("1.234,56");
  });
});

describe("decimalEhZero", () => {
  it("reconhece as formas de zero", () => {
    expect(decimalEhZero("0")).toBe(true);
    expect(decimalEhZero("0.00")).toBe(true);
    expect(decimalEhZero("0.01")).toBe(false);
    expect(decimalEhZero("10.00")).toBe(false);
  });
});
