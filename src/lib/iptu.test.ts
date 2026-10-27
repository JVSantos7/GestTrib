import { describe, expect, it } from "vitest";
import {
  calcularIptu,
  ParametroInvalidoError,
  percentualParaFracao,
  type ImovelCalculo,
  type ParametrosCalculo,
} from "./iptu";

describe("percentualParaFracao", () => {
  it("divide por 100 sem perder precisão", () => {
    expect(percentualParaFracao("0.80")).toBe("0.008");
    expect(percentualParaFracao("1.25")).toBe("0.0125");
    expect(percentualParaFracao("2")).toBe("0.02");
  });
});

const casa: ImovelCalculo = { uso: "RESIDENCIAL", areaTerreno: "360.00", areaConstruida: "142.50", unidadesNoLote: 1 };
const residencial: ParametrosCalculo = { valorM2Terreno: "150.00", valorM2Construcao: "1200.00", aliquota: "0.008" };

describe("calcularIptu", () => {
  it("soma terreno e construção e aplica a alíquota", () => {
    // 360 × 150 = 54.000; 142,50 × 1.200 = 171.000; 225.000 × 0,8% = 1.800
    expect(calcularIptu(casa, residencial)).toEqual({
      areaTerrenoConsiderada: "360.00",
      valorVenalTerreno: "54000.00",
      valorVenalConstrucao: "171000.00",
      valorVenal: "225000.00",
      aliquota: "0.008",
      valorImposto: "1800.00",
    });
  });

  it("no prédio, cada apartamento usa a sua fração do terreno", () => {
    // 1.200 m² ÷ 3 unidades = 400 m² × 200 = 80.000; 68,75 × 1.500 = 103.125; 183.125 × 0,8% = 1.465
    const apto = { uso: "RESIDENCIAL", areaTerreno: "1200.00", areaConstruida: "68.75", unidadesNoLote: 3 } as const;
    const calculo = calcularIptu(apto, { ...residencial, valorM2Terreno: "200.00", valorM2Construcao: "1500.00" });
    expect(calculo.areaTerrenoConsiderada).toBe("400.00");
    expect(calculo.valorVenal).toBe("183125.00");
    expect(calculo.valorImposto).toBe("1465.00");
  });

  it("arredonda a fração do terreno para duas casas", () => {
    const apto = { ...casa, areaTerreno: "1000.00", unidadesNoLote: 3 };
    expect(calcularIptu(apto, residencial).areaTerrenoConsiderada).toBe("333.33");
  });

  it("terreno sem construção paga só pelo terreno", () => {
    const terreno = { uso: "TERRENO", areaTerreno: "450.00", areaConstruida: "0.00", unidadesNoLote: 1 } as const;
    const calculo = calcularIptu(terreno, { valorM2Terreno: "100.00", valorM2Construcao: "900.00", aliquota: "0.02" });
    expect(calculo.valorVenalConstrucao).toBe("0.00");
    expect(calculo.valorImposto).toBe("900.00");
  });

  it("não sofre com o erro do float", () => {
    // Em float, 100.10 * 3 dá 300.29999999999995
    const pequeno = { ...casa, areaTerreno: "100.10", areaConstruida: "0.10" };
    const calculo = calcularIptu(pequeno, { valorM2Terreno: "3", valorM2Construcao: "3", aliquota: "0.01" });
    expect(calculo.valorVenalTerreno).toBe("300.30");
    expect(calculo.valorVenal).toBe("300.60");
  });

  it("meio centavo arredonda para cima", () => {
    // 0,50 × 1,25 = 0,625 → 0,63 (o arredondamento "bancário" daria 0,62)
    const minimo = { ...casa, areaTerreno: "0.50", areaConstruida: "0" };
    expect(calcularIptu(minimo, { valorM2Terreno: "1.25", valorM2Construcao: "0", aliquota: "0.01" }).valorVenalTerreno).toBe(
      "0.63",
    );
    // 1.000,50 × 0,5% = 5,0025 → 5,00 (só o meio centavo exato sobe)
    const venal = { ...casa, areaTerreno: "1000.50", areaConstruida: "0" };
    expect(calcularIptu(venal, { valorM2Terreno: "1", valorM2Construcao: "0", aliquota: "0.005" }).valorImposto).toBe("5.00");
  });

  it("recusa parâmetros que não fazem sentido", () => {
    expect(() => calcularIptu({ ...casa, unidadesNoLote: 0 }, residencial)).toThrow(ParametroInvalidoError);
    expect(() => calcularIptu(casa, { ...residencial, aliquota: "1.5" })).toThrow("menor que 100%");
    expect(() => calcularIptu(casa, { ...residencial, valorM2Terreno: "-10" })).toThrow(ParametroInvalidoError);
    expect(() => calcularIptu(casa, { ...residencial, valorM2Construcao: "abc" })).toThrow(ParametroInvalidoError);
  });
});
