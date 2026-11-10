import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // `npm run db:seed` (ou `prisma db seed`): carga de dados fictícios para demonstração.
    seed: "tsx --conditions=react-server scripts/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
