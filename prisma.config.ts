import path from "node:path";
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Prisma 7 config. The schema lives under the mandated backend/ tree, and the
// connection URL now lives here (no longer allowed inside schema.prisma).
export default defineConfig({
  schema: path.join("src", "backend", "database", "prisma", "schema.prisma"),
  migrations: {
    path: path.join("src", "backend", "database", "prisma", "migrations"),
    seed: "tsx src/backend/database/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
