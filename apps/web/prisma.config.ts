import path from "node:path";
import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * The connection string, or something that explains itself when there isn't one.
 *
 * `env("DATABASE_URL")` throws the moment this file is loaded, and this file is
 * loaded by *every* Prisma command — including `prisma generate`, which needs no
 * database and which runs on every `npm install` through postinstall. The effect
 * was that a missing or wrongly-scoped environment variable failed the install
 * itself, with an error about a config file, on a machine that may only have
 * wanted to compile.
 *
 * So generate works without a database now, and the commands that genuinely need
 * one fail where they try to connect — with the reason in the hostname, rather
 * than a stack trace about loading a TypeScript module.
 */
const url =
  process.env.DATABASE_URL ?? "postgresql://unset@unset.invalid:5432/set-DATABASE_URL-first";

// Prisma 7 config. The schema lives under the mandated backend/ tree, and the
// connection URL now lives here (no longer allowed inside schema.prisma).
export default defineConfig({
  schema: path.join("src", "backend", "database", "prisma", "schema.prisma"),
  migrations: {
    path: path.join("src", "backend", "database", "prisma", "migrations"),
    seed: "tsx src/backend/database/seed.ts",
  },
  datasource: { url },
});
