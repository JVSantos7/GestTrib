import { describe, expect, it } from "vitest";
import { consultaUrl, lerFiltroExercicio, lerFiltrosArrecadacao } from "./filtros-relatorios";

describe("lerFiltrosArrecadacao", () => {
  const hoje = "2026-11-09";

  it("lê o período da URL", () => {
    expect(lerFiltrosArrecadacao({ de: "2026-01-01", ate: "2026-03-31" }, hoje)).toEqual({ de: "2026-01-01", ate: "2026-03-31" });
  });

  it("sem período, usa do dia 1 do mês até hoje", () => {
    expect(lerFiltrosArrecadacao({}, hoje)).toEqual({ de: "2026-11-01", ate: "2026-11-09" });
    expect(lerFiltrosArrecadacao({ de: "", ate: "" }, hoje)).toEqual({ de: "2026-11-01", ate: "2026-11-09" });
  });

  it("data inválida ou inexistente cai no padrão", () => {
    expect(lerFiltrosArrecadacao({ de: "10/03/2026", ate: "2026-02-31" }, hoje)).toEqual({ de: "2026-11-01", ate: "2026-11-09" });
  });

  it("período invertido é desvirado", () => {
    expect(lerFiltrosArrecadacao({ de: "2026-05-31", ate: "2026-05-01" }, hoje)).toEqual({ de: "2026-05-01", ate: "2026-05-31" });
  });

  it("parâmetro repetido: vale o primeiro", () => {
    expect(lerFiltrosArrecadacao({ de: ["2026-02-01", "2026-03-01"] }, hoje).de).toBe("2026-02-01");
  });
});

describe("lerFiltroExercicio", () => {
  it("lê o exercício ou deixa vazio", () => {
    expect(lerFiltroExercicio({ exercicio: "2026" })).toEqual({ exercicio: 2026 });
    expect(lerFiltroExercicio({ exercicio: "" })).toEqual({ exercicio: undefined });
    expect(lerFiltroExercicio({ exercicio: "abc" })).toEqual({ exercicio: undefined });
    expect(lerFiltroExercicio({ exercicio: "1500" })).toEqual({ exercicio: undefined });
  });
});

describe("consultaUrl", () => {
  it("omite o que não foi informado", () => {
    expect(consultaUrl({ de: "2026-01-01", ate: "2026-01-31" })).toBe("?de=2026-01-01&ate=2026-01-31");
    expect(consultaUrl({ exercicio: 2026 })).toBe("?exercicio=2026");
    expect(consultaUrl({ exercicio: undefined })).toBe("");
  });
});
