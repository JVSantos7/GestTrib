import { describe, expect, it } from "vitest";
import { novaSenhaSchema, novoUsuarioSchema, perfilSchema } from "./usuario";

const base = {
  nome: " Maria Fiscal ",
  email: " Maria@VilaSerena.gov.br ",
  perfil: "operador",
  senha: "senha-forte-123",
  confirmacao: "senha-forte-123",
};

function erros(resultado: ReturnType<typeof novoUsuarioSchema.safeParse>) {
  return resultado.success ? {} : Object.fromEntries(resultado.error.issues.map((i) => [i.path.join("."), i.message]));
}

describe("novoUsuarioSchema", () => {
  it("normaliza nome e e-mail (o login não diferencia maiúsculas)", () => {
    expect(novoUsuarioSchema.parse(base)).toMatchObject({ nome: "Maria Fiscal", email: "maria@vilaserena.gov.br" });
  });

  it("exige senha de 10 a 128 caracteres e confirmação igual", () => {
    expect(erros(novoUsuarioSchema.safeParse({ ...base, senha: "curta", confirmacao: "curta" }))).toEqual({
      senha: "A senha precisa ter pelo menos 10 caracteres.",
    });
    expect(erros(novoUsuarioSchema.safeParse({ ...base, confirmacao: "outra-senha-123" }))).toEqual({
      confirmacao: "As senhas não conferem.",
    });
    expect(novoUsuarioSchema.safeParse({ ...base, senha: "a".repeat(129), confirmacao: "a".repeat(129) }).success).toBe(false);
  });

  it("recusa e-mail inválido e perfil inexistente", () => {
    expect(erros(novoUsuarioSchema.safeParse({ ...base, email: "maria", perfil: "superusuario" }))).toEqual({
      email: "E-mail inválido.",
      perfil: "Selecione o perfil.",
    });
  });
});

describe("perfilSchema e novaSenhaSchema", () => {
  it("aceita os três perfis do sistema", () => {
    for (const perfil of ["administrador", "operador", "consulta"]) {
      expect(perfilSchema.safeParse({ perfil }).success).toBe(true);
    }
  });

  it("valida a nova senha com confirmação", () => {
    expect(novaSenhaSchema.safeParse({ senha: "nova-senha-123", confirmacao: "nova-senha-123" }).success).toBe(true);
    expect(novaSenhaSchema.safeParse({ senha: "nova-senha-123", confirmacao: "x" }).success).toBe(false);
  });
});
