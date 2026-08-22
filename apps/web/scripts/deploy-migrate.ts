/**
 * `prisma migrate deploy`, with one thing added: an explanation when it refuses.
 *
 * The build runs migrations, which is what stops a deploy shipping code that
 * reads a column the database does not have. The failure worth handling is
 * P3005: the database has a schema and no migration history, because it was
 * created with `prisma db push`. Prisma is right to stop, and the raw error
 * says nothing about what to do next while a deploy is broken.
 *
 * So on P3005 this prints exactly what the database contains — which migrations
 * are already there and which are not — and how to fix it.
 *
 * It will also fix it, but only when somebody has said so out loud by setting
 * `BASELINE_ON_DEPLOY=1`. That is deliberate friction. Baselining rewrites what
 * a database believes about itself, and a build that does it silently is a
 * build that can hide four missing migrations behind a green tick. Even with
 * the flag set it refuses when any migration is half-applied, because that is a
 * state no migration describes and a person needs to see it.
 *
 * Set the flag, deploy once, remove it.
 */
import "dotenv/config";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/backend/database/generated";
import { inspect, markable, migrationNames, render } from "./lib/baseline";

const HERE = path.join(__dirname, "..");
const OPTED_IN = /^(1|true|yes)$/i.test(process.env.BASELINE_ON_DEPLOY ?? "");
const ADOPT = /^(1|true|yes)$/i.test(process.env.ADOPT_ON_DEPLOY ?? "");

/**
 * Statements that lose something. An adoption is meant to be additive — the
 * database gains the tables it never had — and anything here means the schema
 * has moved *away* from what is deployed, which is a migration to write by hand
 * rather than a gap to close automatically.
 */
const DESTRUCTIVE = /\b(DROP\s+(TABLE|COLUMN|TYPE|SCHEMA|DATABASE)|TRUNCATE|DELETE\s+FROM|ALTER\s+COLUMN\s+"?\w+"?\s+(SET\s+DATA\s+)?TYPE)\b/i;

/** The SQL that would bring the live database up to the schema. */
function diffToSchema(): string {
  return execFileSync(
    "npx",
    [
      "prisma",
      "migrate",
      "diff",
      "--from-config-datasource",
      "--to-schema",
      "src/backend/database/prisma/schema.prisma",
      "--script",
    ],
    { cwd: HERE, encoding: "utf8", env: process.env },
  );
}

/**
 * Bring a database that predates the migration history up to the schema, then
 * record every migration as applied.
 *
 * This is the case where the database is not merely behind — it never had most
 * of these tables, because it was pushed from a much older schema. No migration
 * describes the journey from there to here, so there is nothing to "resolve":
 * the gap is computed, shown in full, and applied in one transaction.
 *
 * Two guards, both absolute. It refuses if the gap contains anything
 * destructive, and it runs the whole thing inside BEGIN/COMMIT so a failure
 * halfway leaves the database exactly as it was.
 */
function adopt(): void {
  console.log("\nComputing what this database is missing…\n");
  const sql = diffToSchema();

  if (sql.trim().length === 0) {
    console.log("Nothing missing — the schema already matches.");
    return;
  }

  const destructive = sql
    .split("\n")
    .filter((line) => DESTRUCTIVE.test(line))
    .slice(0, 10);

  if (destructive.length > 0) {
    console.error(
      "Refusing to adopt. Closing this gap would run statements that lose data:\n" +
        destructive.map((l) => `    ${l.trim()}`).join("\n") +
        "\n\nThat is a migration to write and review by hand, not a gap to close\n" +
        "automatically. Nothing has been changed.",
    );
    process.exit(1);
  }

  console.log(sql);
  console.log(
    `\nThe above is additive only — ${(sql.match(/^CREATE TABLE/gm) ?? []).length} tables, ` +
      `${(sql.match(/^CREATE TYPE/gm) ?? []).length} types, ` +
      `${(sql.match(/ADD COLUMN/g) ?? []).length} columns. Applying it in one transaction.\n`,
  );

  const file = path.join(mkdtempSync(path.join(tmpdir(), "adopt-")), "adopt.sql");
  writeFileSync(file, `BEGIN;\n${sql}\nCOMMIT;\n`);

  execFileSync("npx", ["prisma", "db", "execute", "--file", file], {
    cwd: HERE,
    stdio: ["ignore", "inherit", "inherit"],
    env: process.env,
  });

  console.log("Applied. Recording every migration as part of this database's history:\n");
  for (const name of migrationNames()) {
    process.stdout.write(`  marking ${name} … `);
    execFileSync("npx", ["prisma", "migrate", "resolve", "--applied", name], {
      cwd: HERE,
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    });
    console.log("done");
  }
}

function deploy(): { ok: boolean; output: string } {
  const run = spawnSync("npx", ["prisma", "migrate", "deploy"], {
    cwd: HERE,
    encoding: "utf8",
    env: process.env,
  });
  const output = `${run.stdout ?? ""}${run.stderr ?? ""}`;
  process.stdout.write(output);
  return { ok: run.status === 0, output };
}

async function main() {
  const first = deploy();
  if (first.ok) return;

  if (!first.output.includes("P3005")) process.exit(1);

  console.log("\n────────────────────────────────────────────────────────────");
  console.log("This database has a schema but no migration history, so Prisma");
  console.log("will not run migrations against it. Here is what it contains:\n");

  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("…except DATABASE_URL is not set, so nothing can be checked.");
    process.exit(1);
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  const verdicts = await inspect(prisma);
  await prisma.$disconnect();

  console.log(render(verdicts));

  const partial = verdicts.filter((v) => v.state === "partial");
  const missing = verdicts.filter((v) => v.state === "missing");
  const toMark = markable(verdicts);

  if (partial.length > 0) {
    // A migration that is only half there means this database predates the
    // migration history rather than lagging behind it — it was pushed from a
    // much older schema, so no migration describes how it got to where it is.
    // Marking anything applied would hide the missing half for ever, so
    // baselining is off the table; the gap has to be computed instead.
    if (!ADOPT) {
      console.log(
        "\nA half-applied migration means this database predates the migration\n" +
          "history: it was created from an older schema, and no migration describes\n" +
          "the journey from there to here. Baselining would hide the missing half\n" +
          "for ever, so it is refused — including with BASELINE_ON_DEPLOY set.\n\n" +
          "What fits this case is adoption: compute the gap between what the\n" +
          "database has and what the schema says, show it, and apply it in one\n" +
          "transaction. It refuses outright if closing the gap would drop anything.\n\n" +
          "    Set ADOPT_ON_DEPLOY=1 and deploy again — then remove it.\n\n" +
          "The full SQL is printed before it runs, so the build log is the review.",
      );
      process.exit(1);
    }

    adopt();
    console.log("\nAdopted. Confirming there is nothing left to migrate:\n");
    if (!deploy().ok) process.exit(1);
    console.log("\nRemove ADOPT_ON_DEPLOY now — it has done its one job.");
    return;
  }

  if (!OPTED_IN) {
    console.log(
      `\n${toMark.length} of these are already in the database and ${missing.length} are not.\n\n` +
        "To fix it, either run this once from a machine with the production\n" +
        "DATABASE_URL:\n\n" +
        "    npm run db:baseline -- --apply\n\n" +
        "or set BASELINE_ON_DEPLOY=1 in the deployment's environment variables and\n" +
        "deploy again — then remove it. Both do the same thing: record the\n" +
        "migrations already present, and leave the rest for this step to run.",
    );
    process.exit(1);
  }

  console.log(`\nBASELINE_ON_DEPLOY is set. Recording ${toMark.length} migration(s) as applied.\n`);
  for (const name of toMark) {
    process.stdout.write(`  marking ${name} … `);
    execFileSync("npx", ["prisma", "migrate", "resolve", "--applied", name], {
      cwd: HERE,
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    });
    console.log("done");
  }

  console.log("\nBaselined. Running the migrations that are genuinely missing:\n");
  if (!deploy().ok) process.exit(1);
  console.log("\nRemove BASELINE_ON_DEPLOY now — it has done its one job.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
