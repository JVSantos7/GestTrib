import DecimalBase from "decimal.js";
import { describe, expect, it } from "vitest";
import { calcularVencimentos, dividirEmParcelas, ParcelamentoInvalidoError, planejarParcelas } from "./parcelas";

const somar = (valores: string[]) => valores.reduce((total, v) => total.plus(v), new DecimalBase(0)).toFixed(2);

describe("dividirEmParcelas", () => {
  it("cota única é o próprio total", () => {
    expect(dividirEmParcelas("1800.00", 1)).toEqual(["1800.00"]);
  });

  it("a última parcela fica com a diferença dos centavos", () => {
    expect(dividirEmParcelas("100.00", 3)).toEqual(["33.33", "33.33", "33.34"]);
    expect(dividirEmParcelas("1000.01", 2)).toEqual(["500.00", "500.01"]);
  });

  it("divisão exata não muda nada", () => {
    expect(dividirEmParcelas("1800.00", 10)).toEqual(Array(10).fill("180.00"));
  });

  it("a soma das parcelas é sempre igual ao total", () => {
    for (const total of ["0.10", "1.00", "99.99", "1465.00", "113680.96", "1234567.89"]) {
      for (let quantidade = 1; quantidade <= 10; quantidade++) {
        expect(somar(dividirEmParcelas(total, quantidade))).toBe(total);
      }
    }
  });

  it("recusa o que não faz sentido", () => {
    expect(() => dividirEmParcelas("100.00", 0)).toThrow(ParcelamentoInvalidoError);
    expect(() => dividirEmParcelas("100.00", 11)).toThrow("de 1 a 10 parcelas");
    expect(() => dividirEmParcelas("100.00", 2.5)).toThrow(ParcelamentoInvalidoError);
    expect(() => dividirEmParcelas("0", 1)).toThrow("Valor inválido");
    expect(() => dividirEmParcelas("-10.00", 2)).toThrow("Valor inválido");
    expect(() => dividirEmParcelas("10.005", 2)).toThrow("Valor inválido");
    expect(() => dividirEmParcelas("abc", 2)).toThrow("Valor inválido");
    expect(() => dividirEmParcelas("0.05", 10)).toThrow("pequeno demais");
  });
});

describe("calcularVencimentos", () => {
  it("avança um mês por parcela", () => {
    expect(calcularVencimentos("2026-03-10", 3)).toEqual(["2026-03-10", "2026-04-10", "2026-05-10"]);
  });

  it("vira o ano", () => {
    expect(calcularVencimentos("2026-11-15", 3)).toEqual(["2026-11-15", "2026-12-15", "2027-01-15"]);
  });

  it("no fim do mês usa o último dia, sem ficar preso nele", () => {
    expect(calcularVencimentos("2026-01-31", 4)).toEqual(["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"]);
    expect(calcularVencimentos("2028-01-31", 2)).toEqual(["2028-01-31", "2028-02-29"]);
  });

  it("recusa data que não existe", () => {
    expect(() => calcularVencimentos("2026-02-30", 1)).toThrow("Data de vencimento inválida");
    expect(() => calcularVencimentos("2026-13-01", 1)).toThrow("Data de vencimento inválida");
    expect(() => calcularVencimentos("10/03/2026", 1)).toThrow("Data de vencimento inválida");
  });
});

describe("planejarParcelas", () => {
  it("numera as parcelas e junta valor e vencimento", () => {
    expect(planejarParcelas("100.00", 3, "2026-03-10")).toEqual([
      { numero: 1, valor: "33.33", vencimento: "2026-03-10" },
      { numero: 2, valor: "33.33", vencimento: "2026-04-10" },
      { numero: 3, valor: "33.34", vencimento: "2026-05-10" },
    ]);
  });
});
