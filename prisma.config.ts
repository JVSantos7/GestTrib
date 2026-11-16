import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // `npm run db:seed` (ou `prisma db seed`): carga de dados fictícios para demonstração.
    seed: "tsx --conditions=react-server scripts/seed.ts",
  },
  datasource: {
    // Só os comandos do Prisma (migrations, seed, studio) usam esta URL; o sistema usa DATABASE_URL.
    // Em produção (Neon), DIRECT_URL é a conexão direta: as migrations não funcionam bem pelo
    // pooler. Localmente não precisa definir, e a URL do docker-compose serve para tudo.
    // Não usamos `env()` do Prisma porque ele falha sem a variável, e o `prisma generate`
    // (que roda no `npm install` da Vercel) não precisa de banco.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
});
