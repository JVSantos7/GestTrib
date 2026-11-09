import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";
import { ehEmailDemo } from "@/lib/demo";
import { ac, perfis } from "@/lib/permissoes";
import { prisma } from "@/server/db";

const OITO_HORAS = 60 * 60 * 8;

const MENSAGEM_DEMO = "As contas de demonstração não podem ser alteradas.";
// Rotas em que o administrador age sobre outro usuário (o id vem em `userId`).
// Desbloquear fica de fora: se algo der errado, reativar uma conta demo só ajuda.
const ROTAS_DO_ADMIN_SOBRE_USUARIO = new Set([
  "/admin/ban-user",
  "/admin/set-role",
  "/admin/set-user-password",
  "/admin/update-user",
  "/admin/remove-user",
  "/admin/revoke-user-sessions",
]);
// Rotas em que o usuário logado altera a própria conta.
const ROTAS_DA_PROPRIA_CONTA = new Set(["/change-password", "/change-email", "/update-user", "/delete-user"]);

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

  hooks: {
    // Roda antes de qualquer rota da biblioteca: tanto as chamadas HTTP (/api/auth/...) quanto
    // as feitas pelos services (auth.api...). Por isso a proteção das contas demo fica aqui:
    // um visitante logado como administrador não consegue contorná-la chamando a API direto.
    before: createAuthMiddleware(async (ctx) => {
      if (ROTAS_DO_ADMIN_SOBRE_USUARIO.has(ctx.path)) {
        const userId = (ctx.body as { userId?: unknown } | undefined)?.userId;
        if (typeof userId === "string") {
          const alvo = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
          if (alvo && ehEmailDemo(alvo.email)) throw new APIError("FORBIDDEN", { message: MENSAGEM_DEMO });
        }
      }
      if (ROTAS_DA_PROPRIA_CONTA.has(ctx.path)) {
        const sessao = await getSessionFromCtx(ctx);
        if (sessao && ehEmailDemo(sessao.user.email)) throw new APIError("FORBIDDEN", { message: MENSAGEM_DEMO });
      }
    }),
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
