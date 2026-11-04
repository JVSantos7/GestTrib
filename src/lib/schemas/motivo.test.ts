import { describe, expect, it } from "vitest";
import { motivoSchema } from "./motivo";

describe("motivoSchema", () => {
  const estorno = motivoSchema("estorno");
  const mensagem = (entrada: unknown) => {
    const resultado = estorno.safeParse(entrada);
    return resultado.success ? resultado.data.motivo : resultado.error.issues[0].message;
  };

  it("aceita um motivo descritivo, sem os espaços das pontas", () => {
    expect(mensagem({ motivo: "  Baixa lançada na guia errada  " })).toBe("Baixa lançada na guia errada");
  });

  it("recusa motivo ausente, curto ou longo demais", () => {
    expect(mensagem({})).toBe("Informe o motivo do estorno.");
    expect(mensagem({ motivo: "   erro    " })).toBe("Descreva o motivo com pelo menos 10 caracteres.");
    expect(mensagem({ motivo: "x".repeat(301) })).toBe("Use no máximo 300 caracteres.");
  });
});
