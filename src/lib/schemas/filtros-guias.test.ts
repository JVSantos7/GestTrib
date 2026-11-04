import { describe, expect, it } from "vitest";
import { lerFiltrosGuias, urlGuias } from "./filtros-guias";

describe("lerFiltrosGuias", () => {
  it("lê os filtros da URL", () => {
    expect(lerFiltrosGuias({ busca: " Ana ", situacao: "vencida", vencimentoDe: "2026-01-01", pagina: "2" })).toEqual({
      busca: "Ana",
      situacao: "vencida",
      vencimentoDe: "2026-01-01",
      vencimentoAte: undefined,
      pagina: 2,
    });
  });

  it("valor inválido ou vazio cai no padrão", () => {
    expect(lerFiltrosGuias({ situacao: "PAGA", vencimentoDe: "10/03/2026", vencimentoAte: "", pagina: "-1" })).toEqual({
      busca: "",
      situacao: undefined,
      vencimentoDe: undefined,
      vencimentoAte: undefined,
      pagina: 1,
    });
  });
});

describe("urlGuias", () => {
  it("omite o que está no padrão", () => {
    expect(urlGuias({ busca: "", pagina: 1 })).toBe("/guias");
    expect(urlGuias({ situacao: "paga", vencimentoAte: "2026-12-31", pagina: 3 })).toBe(
      "/guias?situacao=paga&vencimentoAte=2026-12-31&pagina=3",
    );
  });
});
