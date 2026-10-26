import { z } from "zod";
import { PERFIS } from "@/lib/permissoes";

const perfil = z.enum(PERFIS as [string, ...string[]], { error: "Selecione o perfil." });

// Mesmos limites configurados no Better Auth (src/server/auth.ts).
const senha = z
  .string({ error: "Informe a senha." })
  .min(10, { error: "A senha precisa ter pelo menos 10 caracteres." })
  .max(128, { error: "A senha pode ter no máximo 128 caracteres." });

const senhasConferem = {
  check: (dados: { senha: string; confirmacao: string }) => dados.senha === dados.confirmacao,
  erro: { error: "As senhas não conferem.", path: ["confirmacao"] },
};

export const novoUsuarioSchema = z
  .object({
    nome: z.string().trim().min(3, { error: "Use pelo menos 3 caracteres." }).max(150),
    email: z.string().trim().toLowerCase().pipe(z.email({ error: "E-mail inválido." }).max(150)),
    perfil,
    senha,
    confirmacao: z.string(),
  })
  .refine(senhasConferem.check, senhasConferem.erro);

export const perfilSchema = z.object({ perfil });

export const novaSenhaSchema = z
  .object({ senha, confirmacao: z.string() })
  .refine(senhasConferem.check, senhasConferem.erro);

export type NovoUsuario = z.output<typeof novoUsuarioSchema>;
