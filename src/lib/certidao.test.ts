import { describe, expect, it } from "vitest";
import {
  calcularValidade,
  certidaoValida,
  formatarNumeroCertidao,
  gerarCodigoValidacao,
  normalizarCodigoValidacao,
  tipoCertidao,
} from "./certidao";

describe("tipoCertidao", () => {
  it("segue a situação fiscal (CTN, arts. 205 e 206)", () => {
    expect(tipoCertidao("REGULAR")).toBe("NEGATIVA");
    expect(tipoCertidao("A_VENCER")).toBe("POSITIVA_EFEITO_NEGATIVA");
    expect(tipoCertidao("IRREGULAR")).toBe("POSITIVA");
  });
});

describe("validade", () => {
  it("vale 30 dias, virando mês e ano", () => {
    expect(calcularValidade("2026-11-04")).toBe("2026-12-04");
    expect(calcularValidade("2026-12-15")).toBe("2027-01-14");
    expect(calcularValidade("2027-01-31")).toBe("2027-03-02");
  });

  it("vale até o último dia, inclusive", () => {
    expect(certidaoValida("2026-12-04", "2026-12-04")).toBe(true);
    expect(certidaoValida("2026-12-04", "2026-12-05")).toBe(false);
  });
});

describe("número", () => {
  it("formata com zeros e o ano", () => {
    expect(formatarNumeroCertidao(42, 2026)).toBe("000042/2026");
  });
});

describe("código de validação", () => {
  it("gera 16 símbolos em grupos de 4, sem caracteres ambíguos", () => {
    const codigo = gerarCodigoValidacao();
    expect(codigo).toMatch(/^[A-HJ-NP-Z2-9]{4}(-[A-HJ-NP-Z2-9]{4}){3}$/);
  });

  it("é determinado pelos bytes recebidos", () => {
    const bytes = Uint8Array.from({ length: 16 }, (_, i) => i);
    expect(gerarCodigoValidacao(bytes)).toBe("ABCD-EFGH-JKLM-NPQR");
    // 32 vira o primeiro símbolo de novo: o resto da divisão percorre o alfabeto por igual.
    expect(gerarCodigoValidacao(new Uint8Array(16).fill(32))).toBe("AAAA-AAAA-AAAA-AAAA");
  });

  it("não repete em várias gerações", () => {
    const codigos = new Set(Array.from({ length: 1000 }, () => gerarCodigoValidacao()));
    expect(codigos.size).toBe(1000);
  });

  it("aceita o código digitado de qualquer jeito", () => {
    expect(normalizarCodigoValidacao("abcd efgh-jklm npqr")).toBe("ABCD-EFGH-JKLM-NPQR");
    expect(normalizarCodigoValidacao(" ABCDEFGHJKLMNPQR ")).toBe("ABCD-EFGH-JKLM-NPQR");
  });

  it("recusa tamanho errado ou símbolos fora do alfabeto", () => {
    expect(normalizarCodigoValidacao("ABCD-EFGH-JKLM")).toBeNull();
    expect(normalizarCodigoValidacao("ABCD-EFGH-JKLM-NPQ0")).toBeNull();
    expect(normalizarCodigoValidacao("ABCD-EFGH-JKLM-NPQ%")).toBeNull();
    expect(normalizarCodigoValidacao("")).toBeNull();
  });
});
