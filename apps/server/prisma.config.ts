import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // `prisma generate` não precisa de banco; migrate/seed falham com mensagem clara se faltar.
    url: process.env.DATABASE_URL ?? "",
  },
});
