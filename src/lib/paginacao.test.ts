import { describe, expect, it } from "vitest";
import { calcularPaginacao } from "./paginacao";

describe("calcularPaginacao", () => {
  it("calcula a primeira página", () => {
    expect(calcularPaginacao(37, 1, 10)).toEqual({
      pagina: 1,
      totalPaginas: 4,
      total: 37,
      inicio: 1,
      fim: 10,
      pular: 0,
    });
  });

  it("calcula a última página, parcialmente cheia", () => {
    expect(calcularPaginacao(37, 4, 10)).toMatchObject({ inicio: 31, fim: 37, pular: 30 });
  });

  it("não cria página extra quando o total é múltiplo do tamanho", () => {
    expect(calcularPaginacao(30, 3, 10)).toMatchObject({ totalPaginas: 3, inicio: 21, fim: 30 });
  });

  it("ajusta página além da última para a última", () => {
    expect(calcularPaginacao(37, 99, 10)).toMatchObject({ pagina: 4, pular: 30 });
  });

  it("ajusta página menor que 1 para a primeira", () => {
    expect(calcularPaginacao(37, 0, 10)).toMatchObject({ pagina: 1, pular: 0 });
  });

  it("trata lista vazia como uma única página sem itens", () => {
    expect(calcularPaginacao(0, 1, 10)).toEqual({
      pagina: 1,
      totalPaginas: 1,
      total: 0,
      inicio: 0,
      fim: 0,
      pular: 0,
    });
  });
});
