import { describe, expect, it } from "vitest";
import { CONTAS_DEMO, ehEmailDemo } from "./demo";
import { PERFIS } from "./permissoes";

describe("contas de demonstração", () => {
  it("há uma conta para cada perfil", () => {
    expect(Object.keys(CONTAS_DEMO).sort()).toEqual([...PERFIS].sort());
  });

  it("reconhece os e-mails demo, sem diferenciar maiúsculas", () => {
    expect(ehEmailDemo("operador@demo.gesttrib.example")).toBe(true);
    expect(ehEmailDemo(" Consulta@Demo.GestTrib.example ")).toBe(true);
    expect(ehEmailDemo("ana@prefeitura.example")).toBe(false);
  });
});
