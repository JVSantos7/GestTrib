import { describe, expect, it } from "vitest";
import { parametrosIptuSchema } from "./parametros-iptu";

const valido = {
  exercicio: "2026",
  aliquotaResidencial: "0,80",
  aliquotaComercial: "1,2",
  aliquotaIndustrial: "1,20",
  aliquotaTerreno: "2",
  valorM2Residencial: "1.200,00",
  valorM2Comercial: "1500",
  valorM2Industrial: "900,5",
  terrenos: { "01": "150,00", "06": "1.000" },
};

function erros(entrada: object) {
  const resultado = parametrosIptuSchema.safeParse(entrada);
  return resultado.success ? {} : Object.fromEntries(resultado.error.issues.map((i) => [i.path.join("."), i.message]));
}

describe("parametrosIptuSchema", () => {
  it("converte o formato brasileiro em texto decimal", () => {
    expect(parametrosIptuSchema.parse(valido)).toEqual({
      exercicio: 2026,
      aliquotaResidencial: "0.80",
      aliquotaComercial: "1.20",
      aliquotaIndustrial: "1.20",
      aliquotaTerreno: "2.00",
      valorM2Residencial: "1200.00",
      valorM2Comercial: "1500.00",
      valorM2Industrial: "900.50",
      terrenos: { "01": "150.00", "06": "1000.00" },
    });
  });

  it("exige alíquota acima de zero e abaixo de 100%", () => {
    expect(erros({ ...valido, aliquotaResidencial: "0,00" })).toEqual({ aliquotaResidencial: "Deve ser maior que zero." });
    expect(erros({ ...valido, aliquotaTerreno: "100" })).toEqual({ aliquotaTerreno: "Deve ser menor que 100." });
    expect(erros({ ...valido, aliquotaComercial: "1.2" })).toEqual({
      aliquotaComercial: "Use o formato 1.234,56 (vírgula nos decimais).",
    });
  });

  it("valida exercício e setores", () => {
    expect(erros({ ...valido, exercicio: "26" })).toEqual({ exercicio: "Informe o ano com 4 dígitos." });
    expect(erros({ ...valido, exercicio: "1999" })).toEqual({ exercicio: "Use um ano a partir de 2000." });
    expect(erros({ ...valido, terrenos: { "00": "150" } })).toEqual({ "terrenos.00": "Setor inválido." });
    expect(erros({ ...valido, terrenos: { "02": "" } })).toEqual({ "terrenos.02": "Informe o valor do m² do terreno." });
  });
});
