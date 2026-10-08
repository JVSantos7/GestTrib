import { describe, expect, it } from "vitest";
import { lerFiltrosContribuintes, urlContribuintes } from "./filtros-contribuintes";

describe("lerFiltrosContribuintes", () => {
  it("usa os padrões quando não há parâmetros", () => {
    expect(lerFiltrosContribuintes({})).toEqual({ busca: "", tipo: undefined, pagina: 1 });
  });

  it("lê busca, tipo e página", () => {
    expect(lerFiltrosContribuintes({ busca: "  maria ", tipo: "JURIDICA", pagina: "3" })).toEqual({
      busca: "maria",
      tipo: "JURIDICA",
      pagina: 3,
    });
  });

  it("ignora valores inválidos em vez de falhar", () => {
    expect(lerFiltrosContribuintes({ tipo: "OUTRO", pagina: "abc" })).toEqual({
      busca: "",
      tipo: undefined,
      pagina: 1,
    });
    expect(lerFiltrosContribuintes({ pagina: "0" }).pagina).toBe(1);
    expect(lerFiltrosContribuintes({ pagina: "-2" }).pagina).toBe(1);
    expect(lerFiltrosContribuintes({ pagina: "1.5" }).pagina).toBe(1);
  });

  it("trata o tipo vazio do seletor 'Todos' como sem filtro", () => {
    expect(lerFiltrosContribuintes({ tipo: "" }).tipo).toBeUndefined();
  });

  it("usa o primeiro valor de um parâmetro repetido", () => {
    expect(lerFiltrosContribuintes({ busca: ["ana", "bia"] }).busca).toBe("ana");
  });

  it("descarta busca longa demais", () => {
    expect(lerFiltrosContribuintes({ busca: "a".repeat(101) }).busca).toBe("");
  });
});

describe("urlContribuintes", () => {
  it("omite filtros no padrão", () => {
    expect(urlContribuintes({})).toBe("/contribuintes");
    expect(urlContribuintes({ busca: "", tipo: undefined, pagina: 1 })).toBe("/contribuintes");
  });

  it("inclui os filtros informados e codifica a busca", () => {
    expect(urlContribuintes({ busca: "josé silva", tipo: "FISICA", pagina: 2 })).toBe(
      "/contribuintes?busca=jos%C3%A9+silva&tipo=FISICA&pagina=2",
    );
  });
});
