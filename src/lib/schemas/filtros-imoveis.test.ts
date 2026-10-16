import { describe, expect, it } from "vitest";
import { lerFiltrosImoveis, urlImoveis } from "./filtros-imoveis";

describe("lerFiltrosImoveis", () => {
  it("usa os padrões quando não há parâmetros", () => {
    expect(lerFiltrosImoveis({})).toEqual({ busca: "", uso: undefined, pagina: 1 });
  });

  it("lê busca, uso e página", () => {
    expect(lerFiltrosImoveis({ busca: " acácias ", uso: "TERRENO", pagina: "2" })).toEqual({
      busca: "acácias",
      uso: "TERRENO",
      pagina: 2,
    });
  });

  it("ignora valores inválidos em vez de falhar", () => {
    expect(lerFiltrosImoveis({ uso: "CHACARA", pagina: "abc" })).toEqual({
      busca: "",
      uso: undefined,
      pagina: 1,
    });
  });
});

describe("urlImoveis", () => {
  it("omite filtros no padrão e inclui os informados", () => {
    expect(urlImoveis({ busca: "", pagina: 1 })).toBe("/imoveis");
    expect(urlImoveis({ busca: "01.002", uso: "COMERCIAL", pagina: 3 })).toBe(
      "/imoveis?busca=01.002&uso=COMERCIAL&pagina=3",
    );
  });
});
