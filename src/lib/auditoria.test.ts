import { describe, expect, it } from "vitest";
import { descreverDetalhe } from "./auditoria";

describe("descreverDetalhe", () => {
  it("descreve a troca de perfil com os rótulos da tela", () => {
    expect(descreverDetalhe({ campo: "perfil", de: "operador", para: "consulta" })).toBe(
      "Perfil: Operador → Consulta",
    );
  });

  it("descreve situação e senha, que não têm valor anterior", () => {
    expect(descreverDetalhe({ campo: "situacao", para: "desativado" })).toBe("Usuário desativado");
    expect(descreverDetalhe({ campo: "situacao", para: "ativo" })).toBe("Usuário reativado");
    expect(descreverDetalhe({ campo: "senha", para: "redefinida" })).toBe("Senha redefinida");
  });

  it("descreve baixa e estorno de guia", () => {
    expect(descreverDetalhe({ campo: "situacao", para: "paga", valorPago: "600.00" })).toBe("Baixa de pagamento");
    expect(descreverDetalhe({ campo: "situacao", para: "estornada", motivo: "Valor de outra guia" })).toBe(
      "Estorno: Valor de outra guia",
    );
  });

  it("descreve o cancelamento de lançamento com o motivo", () => {
    expect(descreverDetalhe({ campo: "situacao", para: "cancelado", motivo: "Área errada" })).toBe(
      "Cancelamento: Área errada",
    );
  });

  it("ignora retratos completos e valores estranhos", () => {
    expect(descreverDetalhe({ nome: "Maria", documento: "12345678909" })).toBeNull();
    expect(descreverDetalhe({ campo: "documento", para: "123" })).toBeNull();
    expect(descreverDetalhe(null)).toBeNull();
    expect(descreverDetalhe("texto")).toBeNull();
  });
});
