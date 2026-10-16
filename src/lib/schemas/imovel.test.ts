import { describe, expect, it } from "vitest";
import { formatarInscricao, imovelSchema, type ImovelEntrada } from "./imovel";

const base: ImovelEntrada = {
  inscricao: "01.002.0003.001",
  uso: "RESIDENCIAL",
  areaTerreno: "360",
  areaConstruida: "1.234,5",
  cep: "58000-100",
  logradouro: " Rua das Acácias ",
  numero: "120",
  complemento: "",
  bairro: "Centro",
  documentoProprietario: "529.982.247-25",
};

function erros(entrada: ImovelEntrada) {
  const resultado = imovelSchema.safeParse(entrada);
  if (resultado.success) return {};
  const porCampo: Record<string, string> = {};
  for (const issue of resultado.error.issues) {
    porCampo[issue.path.join(".")] ??= issue.message;
  }
  return porCampo;
}

describe("formatarInscricao", () => {
  it("aplica a máscara setor.quadra.lote.unidade", () => {
    expect(formatarInscricao("010020003001")).toBe("01.002.0003.001");
  });
});

describe("imovelSchema", () => {
  it("normaliza inscrição, áreas, CEP, textos e documento", () => {
    expect(imovelSchema.parse(base)).toEqual({
      inscricao: "010020003001",
      uso: "RESIDENCIAL",
      areaTerreno: "360.00",
      areaConstruida: "1234.50",
      cep: "58000100",
      logradouro: "Rua das Acácias",
      numero: "120",
      complemento: null,
      bairro: "Centro",
      documentoProprietario: "52998224725",
    });
  });

  it("aceita CNPJ, inclusive alfanumérico, como proprietário", () => {
    expect(imovelSchema.parse({ ...base, documentoProprietario: "12.abc.345/01de-35" }).documentoProprietario).toBe(
      "12ABC34501DE35",
    );
  });

  it("valida a inscrição imobiliária", () => {
    expect(erros({ ...base, inscricao: "01.002.0003" })).toEqual({
      inscricao: "A inscrição deve ter 12 dígitos (setor.quadra.lote.unidade).",
    });
    const parteZero = "Setor, quadra, lote e unidade não podem ser zero.";
    expect(erros({ ...base, inscricao: "00.002.0003.001" })).toEqual({ inscricao: parteZero });
    expect(erros({ ...base, inscricao: "01.000.0003.001" })).toEqual({ inscricao: parteZero });
    expect(erros({ ...base, inscricao: "01.002.0000.001" })).toEqual({ inscricao: parteZero });
    expect(erros({ ...base, inscricao: "01.002.0003.000" })).toEqual({ inscricao: parteZero });
  });

  it("valida o formato e o tamanho das áreas", () => {
    expect(erros({ ...base, areaTerreno: "360.5" })).toEqual({
      areaTerreno: "Use o formato 1.234,56 (vírgula nos decimais).",
    });
    expect(erros({ ...base, areaTerreno: "" })).toEqual({ areaTerreno: "Informe a área do terreno." });
    expect(erros({ ...base, areaTerreno: "0,00" })).toEqual({
      areaTerreno: "A área do terreno deve ser maior que zero.",
    });
    expect(erros({ ...base, areaTerreno: "12345678901" })).toEqual({ areaTerreno: "Valor grande demais." });
    // 10 dígitos inteiros é o máximo que cabe na coluna
    expect(imovelSchema.parse({ ...base, areaTerreno: "9.999.999.999,99" }).areaTerreno).toBe("9999999999.99");
  });

  it("exige área construída quando o imóvel não é terreno", () => {
    expect(erros({ ...base, areaConstruida: "" })).toEqual({
      areaConstruida: "Informe a área construída (ou escolha 'Terreno sem construção').",
    });
    expect(erros({ ...base, areaConstruida: "0" })).toHaveProperty("areaConstruida");
  });

  it("aceita terreno sem área construída e recusa terreno com construção", () => {
    expect(imovelSchema.parse({ ...base, uso: "TERRENO", areaConstruida: "" }).areaConstruida).toBe("0.00");
    expect(erros({ ...base, uso: "TERRENO" })).toEqual({
      areaConstruida: "Terreno sem construção não pode ter área construída.",
    });
  });

  it("permite área construída maior que o terreno (prédios de vários andares)", () => {
    expect(imovelSchema.safeParse({ ...base, areaTerreno: "300", areaConstruida: "1.800" }).success).toBe(true);
  });

  it("valida o documento do proprietário e os campos obrigatórios", () => {
    expect(
      erros({
        ...base,
        documentoProprietario: "529.982.247-26",
        cep: "123",
        logradouro: "",
        uso: "OUTRO" as never,
      }),
    ).toEqual({
      documentoProprietario: "CPF/CNPJ inválido.",
      cep: "O CEP deve ter 8 dígitos.",
      logradouro: "Informe o logradouro.",
      uso: "Selecione o tipo de uso.",
    });
    expect(erros({ ...base, documentoProprietario: "" })).toEqual({
      documentoProprietario: "Informe o CPF/CNPJ do proprietário.",
    });
  });
});
