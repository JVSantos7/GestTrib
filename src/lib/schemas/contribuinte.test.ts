import { describe, expect, it } from "vitest";
import { contribuinteSchema, type ContribuinteEntrada } from "./contribuinte";

const base: ContribuinteEntrada = {
  tipoPessoa: "FISICA",
  documento: "529.982.247-25",
  nome: "  Maria da Silva  ",
  email: "",
  telefone: "",
  cep: "69900-000",
  logradouro: "Rua das Flores",
  numero: "100",
  complemento: "",
  bairro: "Centro",
  cidade: "Rio Branco",
  uf: "ac",
};

function erros(entrada: ContribuinteEntrada) {
  const resultado = contribuinteSchema.safeParse(entrada);
  if (resultado.success) return {};
  // Mantém a primeira mensagem de cada campo, que é a exibida no formulário.
  const porCampo: Record<string, string> = {};
  for (const issue of resultado.error.issues) {
    porCampo[issue.path.join(".")] ??= issue.message;
  }
  return porCampo;
}

describe("contribuinteSchema", () => {
  it("normaliza máscaras, espaços e campos opcionais vazios", () => {
    expect(contribuinteSchema.parse(base)).toEqual({
      tipoPessoa: "FISICA",
      documento: "52998224725",
      nome: "Maria da Silva",
      email: null,
      telefone: null,
      cep: "69900000",
      logradouro: "Rua das Flores",
      numero: "100",
      complemento: null,
      bairro: "Centro",
      cidade: "Rio Branco",
      uf: "AC",
    });
  });

  it("mantém os campos opcionais preenchidos", () => {
    const dados = contribuinteSchema.parse({
      ...base,
      email: " maria@exemplo.com ",
      telefone: "(68) 99999-0000",
      complemento: "Apto 2",
    });
    expect(dados.email).toBe("maria@exemplo.com");
    expect(dados.telefone).toBe("68999990000");
    expect(dados.complemento).toBe("Apto 2");
  });

  it("valida o documento conforme o tipo de pessoa", () => {
    expect(erros({ ...base, documento: "529.982.247-26" })).toEqual({ documento: "CPF inválido." });
    // CNPJ válido informado para pessoa física
    expect(erros({ ...base, documento: "11.222.333/0001-81" })).toEqual({
      documento: "CPF inválido.",
    });
    // CPF válido informado para pessoa jurídica
    expect(erros({ ...base, tipoPessoa: "JURIDICA" })).toEqual({ documento: "CNPJ inválido." });
  });

  it("aceita pessoa jurídica com CNPJ numérico ou alfanumérico", () => {
    const numerico = contribuinteSchema.parse({
      ...base,
      tipoPessoa: "JURIDICA",
      documento: "11.222.333/0001-81",
    });
    expect(numerico.documento).toBe("11222333000181");

    const alfanumerico = contribuinteSchema.parse({
      ...base,
      tipoPessoa: "JURIDICA",
      documento: "12.abc.345/01de-35",
    });
    expect(alfanumerico.documento).toBe("12ABC34501DE35");
  });

  it("aponta os campos obrigatórios e os formatos inválidos", () => {
    expect(
      erros({
        ...base,
        nome: " ",
        email: "maria@",
        telefone: "9999",
        cep: "123",
        logradouro: "",
        uf: "XX",
      }),
    ).toEqual({
      nome: "Informe o nome.",
      email: "E-mail inválido.",
      telefone: "Informe o telefone com DDD (10 ou 11 dígitos).",
      cep: "O CEP deve ter 8 dígitos.",
      logradouro: "Informe o logradouro.",
      uf: "Selecione a UF.",
    });
  });

  it("rejeita tipo de pessoa desconhecido", () => {
    expect(erros({ ...base, tipoPessoa: "OUTRO" as never })).toHaveProperty("tipoPessoa");
  });
});
