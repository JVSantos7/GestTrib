import { describe, expect, it } from "vitest";
import { converterRespostaCep, converterRespostaCnpj } from "./brasilapi";

// Respostas no mesmo formato da BrasilAPI, com dados inventados.

describe("converterRespostaCep", () => {
  it("leva os campos da API para os nomes do formulário", () => {
    const resposta = {
      cep: "01001000",
      state: "SP",
      city: "São Paulo",
      neighborhood: "Sé",
      street: "Praça da Sé",
      service: "open-cep",
    };
    expect(converterRespostaCep(resposta)).toEqual({
      cep: "01001000",
      logradouro: "Praça da Sé",
      bairro: "Sé",
      cidade: "São Paulo",
      uf: "SP",
    });
  });

  it("deixa em branco o que não veio (CEP geral de cidade pequena não tem rua nem bairro)", () => {
    const resposta = { cep: "58900000", state: "PB", city: "Cajazeiras", neighborhood: null, street: null };
    expect(converterRespostaCep(resposta)).toMatchObject({ logradouro: "", bairro: "", cidade: "Cajazeiras" });
  });

  it("ignora UF desconhecida e resposta vazia", () => {
    expect(converterRespostaCep({ state: "XX" }).uf).toBe("");
    expect(converterRespostaCep(null)).toEqual({ cep: "", logradouro: "", bairro: "", cidade: "", uf: "" });
  });
});

describe("converterRespostaCnpj", () => {
  const base = {
    cnpj: "11222333000181",
    razao_social: "COMERCIO DE TESTE LTDA",
    email: "CONTATO@TESTE.COM.BR",
    ddd_telefone_1: "8333221100",
    ddd_telefone_2: "",
    cep: "58000000",
    descricao_tipo_de_logradouro: "RUA",
    logradouro: "DAS FLORES",
    numero: "120",
    complemento: "SALA  2",
    bairro: "CENTRO",
    municipio: "JOAO PESSOA",
    uf: "PB",
    descricao_situacao_cadastral: "ATIVA",
  };

  it("monta os dados do contribuinte a partir da resposta da Receita", () => {
    expect(converterRespostaCnpj(base)).toEqual({
      nome: "COMERCIO DE TESTE LTDA",
      email: "contato@teste.com.br",
      telefone: "8333221100",
      cep: "58000000",
      logradouro: "RUA DAS FLORES",
      numero: "120",
      complemento: "SALA 2",
      bairro: "CENTRO",
      cidade: "JOAO PESSOA",
      uf: "PB",
      situacaoCadastral: "ATIVA",
    });
  });

  it("não repete o tipo quando o logradouro já começa com ele", () => {
    const resposta = { ...base, descricao_tipo_de_logradouro: "AVENIDA", logradouro: "AVENIDA BRASIL" };
    expect(converterRespostaCnpj(resposta).logradouro).toBe("AVENIDA BRASIL");
  });

  it("usa o segundo telefone quando o primeiro está vazio ou inválido", () => {
    expect(converterRespostaCnpj({ ...base, ddd_telefone_1: "", ddd_telefone_2: "83988887777" }).telefone).toBe(
      "83988887777",
    );
    expect(converterRespostaCnpj({ ...base, ddd_telefone_1: "123", ddd_telefone_2: "" }).telefone).toBe("");
  });

  it("descarta e-mail inválido e corta textos longos no limite do banco", () => {
    const resposta = { ...base, email: "sem-arroba", complemento: "A".repeat(100) };
    const dados = converterRespostaCnpj(resposta);
    expect(dados.email).toBe("");
    expect(dados.complemento).toHaveLength(60);
  });

  it("traz a situação cadastral para o aviso ao operador", () => {
    expect(converterRespostaCnpj({ ...base, descricao_situacao_cadastral: "Inapta" }).situacaoCadastral).toBe(
      "INAPTA",
    );
  });
});
