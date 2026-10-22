import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";
import { ac, perfis } from "@/lib/permissoes";
import { prisma } from "@/server/db";

const OITO_HORAS = 60 * 60 * 8;

export const auth = betterAuth({
  appName: "GestTrib",
  // A biblioteca grava usuários, sessões e contas pelo mesmo Prisma do resto do sistema.
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  advanced: {
    database: { generateId: "uuid" },
  },

  emailAndPassword: {
    enabled: true,
    // Ninguém cria a própria conta: usuários são criados pelo administrador.
    disableSignUp: true,
    minPasswordLength: 10,
    maxPasswordLength: 128,
  },

  session: {
    // Depois de 8 horas sem renovar, a sessão vence e é preciso entrar de novo.
    expiresIn: OITO_HORAS,
    // Enquanto o usuário usa o sistema, o prazo é renovado no máximo 1 vez por hora.
    updateAge: 60 * 60,
  },

  rateLimit: {
    // Por padrão a biblioteca só limita em produção; aqui vale sempre, para dar para testar.
    enabled: true,
    window: 60,
    max: 100,
    // No login, no máximo 5 tentativas por minuto vindas do mesmo IP (contra quem tenta adivinhar a senha).
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
    },
  },

  plugins: [
    admin({
      ac,
      roles: perfis,
      defaultRole: "consulta",
      adminRoles: ["administrador"],
      bannedUserMessage: "Usuário desativado. Procure o administrador do sistema.",
    }),
    // Deixa as Server Actions gravarem o cookie de sessão. Precisa ser o último plugin.
    nextCookies(),
  ],
});
