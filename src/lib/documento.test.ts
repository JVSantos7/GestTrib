import { describe, expect, it } from "vitest";
import {
  formatarCnpj,
  formatarCpf,
  formatarDocumento,
  limparDocumento,
  validarCnpj,
  validarCpf,
} from "./documento";

describe("limparDocumento", () => {
  it("remove a máscara e converte para maiúsculas", () => {
    expect(limparDocumento("529.982.247-25")).toBe("52998224725");
    expect(limparDocumento("12.abc.345/01de-35")).toBe("12ABC34501DE35");
  });
});

describe("validarCpf", () => {
  it("aceita CPF válido, com ou sem máscara", () => {
    expect(validarCpf("529.982.247-25")).toBe(true);
    expect(validarCpf("52998224725")).toBe(true);
    expect(validarCpf("111.444.777-35")).toBe(true);
  });

  it("aceita CPF cujo dígito verificador é zero", () => {
    expect(validarCpf("123.456.789-09")).toBe(true);
  });

  it("rejeita dígito verificador incorreto", () => {
    expect(validarCpf("529.982.247-26")).toBe(false);
    expect(validarCpf("529.982.247-15")).toBe(false);
  });

  it("rejeita sequências de dígitos iguais", () => {
    expect(validarCpf("000.000.000-00")).toBe(false);
    expect(validarCpf("111.111.111-11")).toBe(false);
  });

  it("rejeita tamanho errado, letras e vazio", () => {
    expect(validarCpf("5299822472")).toBe(false);
    expect(validarCpf("529982247250")).toBe(false);
    expect(validarCpf("5299822472A")).toBe(false);
    expect(validarCpf("")).toBe(false);
  });
});

describe("validarCnpj", () => {
  it("aceita CNPJ numérico válido, com ou sem máscara", () => {
    expect(validarCnpj("11.222.333/0001-81")).toBe(true);
    expect(validarCnpj("11222333000181")).toBe(true);
    expect(validarCnpj("11.444.777/0001-61")).toBe(true);
  });

  it("aceita CNPJ alfanumérico válido", () => {
    // Exemplo divulgado pela Receita Federal/Serpro para o novo formato.
    expect(validarCnpj("12.ABC.345/01DE-35")).toBe(true);
    expect(validarCnpj("12abc34501de35")).toBe(true);
  });

  it("rejeita dígito verificador incorreto", () => {
    expect(validarCnpj("11.222.333/0001-82")).toBe(false);
    expect(validarCnpj("12.ABC.345/01DE-36")).toBe(false);
  });

  it("rejeita letras nos dígitos verificadores", () => {
    expect(validarCnpj("12ABC34501DE3A")).toBe(false);
  });

  it("rejeita sequências iguais, tamanho errado e vazio", () => {
    expect(validarCnpj("00.000.000/0000-00")).toBe(false);
    expect(validarCnpj("1122233300018")).toBe(false);
    expect(validarCnpj("112223330001811")).toBe(false);
    expect(validarCnpj("")).toBe(false);
  });
});

describe("formatação", () => {
  it("aplica a máscara de CPF e de CNPJ", () => {
    expect(formatarCpf("52998224725")).toBe("529.982.247-25");
    expect(formatarCnpj("11222333000181")).toBe("11.222.333/0001-81");
    expect(formatarCnpj("12ABC34501DE35")).toBe("12.ABC.345/01DE-35");
  });

  it("escolhe a máscara pelo tamanho", () => {
    expect(formatarDocumento("52998224725")).toBe("529.982.247-25");
    expect(formatarDocumento("11222333000181")).toBe("11.222.333/0001-81");
  });

  it("devolve o valor original quando o tamanho não confere", () => {
    expect(formatarCpf("123")).toBe("123");
    expect(formatarCnpj("123")).toBe("123");
  });
});
