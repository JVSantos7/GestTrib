import { describe, expect, it } from "vitest";
import { agruparDevedores, calcularPercentual, formatarPercentual, resumirLancamentosPorUso, somarValores } from "./relatorios";

describe("somarValores", () => {
  it("soma sem erro de float", () => {
    expect(somarValores(["0.10", "0.20"])).toBe("0.30");
    expect(somarValores([])).toBe("0.00");
  });
});

describe("calcularPercentual", () => {
  it("calcula com 1 casa, arredondando meio para cima", () => {
    expect(calcularPercentual("50.00", "200.00")).toBe("25.0");
    expect(calcularPercentual("1.00", "3.00")).toBe("33.3");
    expect(calcularPercentual("2.00", "3.00")).toBe("66.7");
    expect(calcularPercentual("1.00", "800.00")).toBe("0.1"); // 0,125% → 0,1%
  });

  it("total zero não divide por zero", () => {
    expect(calcularPercentual("0.00", "0.00")).toBe("0.0");
  });

  it("formata com vírgula", () => {
    expect(formatarPercentual("33.3")).toBe("33,3%");
  });
});

describe("agruparDevedores", () => {
  const ana = { contribuinteId: "a", nome: "Ana", documento: "11111111111" };
  const bruno = { contribuinteId: "b", nome: "Bruno", documento: "22222222222" };
  const carla = { contribuinteId: "c", nome: "Carla", documento: "33333333333" };

  it("agrupa por contribuinte, do maior devedor para o menor", () => {
    const resumo = agruparDevedores([
      { ...ana, valor: "100.00", vencimento: "2026-03-10" },
      { ...bruno, valor: "500.00", vencimento: "2026-05-10" },
      { ...ana, valor: "100.00", vencimento: "2026-02-10" },
    ]);
    expect(resumo).toEqual({
      devedores: [
        { ...bruno, quantidadeGuias: 1, vencimentoMaisAntigo: "2026-05-10", total: "500.00" },
        { ...ana, quantidadeGuias: 2, vencimentoMaisAntigo: "2026-02-10", total: "200.00" },
      ],
      quantidadeGuias: 3,
      total: "700.00",
    });
  });

  it("no empate, ordena por nome", () => {
    const resumo = agruparDevedores([
      { ...carla, valor: "50.00", vencimento: "2026-01-10" },
      { ...ana, valor: "50.00", vencimento: "2026-01-10" },
    ]);
    expect(resumo.devedores.map((devedor) => devedor.nome)).toEqual(["Ana", "Carla"]);
  });

  it("sem guias vencidas, sem devedores", () => {
    expect(agruparDevedores([])).toEqual({ devedores: [], quantidadeGuias: 0, total: "0.00" });
  });
});

describe("resumirLancamentosPorUso", () => {
  it("separa por uso, na ordem do cadastro, e soma o total", () => {
    const resumo = resumirLancamentosPorUso([
      { uso: "COMERCIAL", valorImposto: "1000.00", valoresPagos: [] },
      { uso: "RESIDENCIAL", valorImposto: "300.00", valoresPagos: ["100.00", "100.00"] },
      { uso: "RESIDENCIAL", valorImposto: "100.00", valoresPagos: ["100.00"] },
    ]);
    expect(resumo.linhas).toEqual([
      { uso: "RESIDENCIAL", quantidade: 2, lancado: "400.00", arrecadado: "300.00", aReceber: "100.00", percentualArrecadado: "75.0" },
      { uso: "COMERCIAL", quantidade: 1, lancado: "1000.00", arrecadado: "0.00", aReceber: "1000.00", percentualArrecadado: "0.0" },
    ]);
    expect(resumo.total).toEqual({
      quantidade: 3,
      lancado: "1400.00",
      arrecadado: "300.00",
      aReceber: "1100.00",
      percentualArrecadado: "21.4",
    });
  });

  it("exercício sem lançamentos", () => {
    expect(resumirLancamentosPorUso([])).toEqual({
      linhas: [],
      total: { quantidade: 0, lancado: "0.00", arrecadado: "0.00", aReceber: "0.00", percentualArrecadado: "0.0" },
    });
  });
});
