/**
 * Teach an existing database its own migration history.
 *
 * The production database was created with `prisma db push`, which builds the
 * schema and keeps no record of how. `prisma migrate deploy` then refuses it
 * (P3005 — "the database schema is not empty"), because a migration tool that
 * runs migrations against a database whose history it cannot see is how a
 * production table gets dropped.
 *
 * Baselining is the fix, and the dangerous way to do it is to mark every
 * migration applied and hope. If the database is actually behind, that hides
 * real migrations for ever and the first request that touches a missing column
 * is a 500 nobody can explain.
 *
 * So this looks first. For each migration it reads the SQL, works out which
 * tables and columns that migration creates, and asks the database whether they
 * are there:
 *
 *   present  — every object exists. Safe to mark as already applied.
 *   missing  — none of them exist. `migrate deploy` should run it.
 *   partial  — some do. Stop; a person needs to look at this one.
 *
 *   npm run db:baseline --workspace=@climbkiddo/web            # report only
 *   npm run db:baseline --workspace=@climbkiddo/web -- --apply # then do it
 *
 * `--apply` only ever marks *present* migrations as applied. It never runs SQL
 * against your data; `prisma migrate deploy` does that afterwards, in the
 * ordinary way, for the ones that are genuinely missing.
 */
import "dotenv/config";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/backend/database/generated";

const MIGRATIONS = path.join(__dirname, "../src/backend/database/prisma/migrations");
const apply = process.argv.includes("--apply");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Point it at the database you mean to baseline.");
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

interface Expectation {
  table: string;
  /** Empty means "the table itself", otherwise the columns it must have. */
  columns: string[];
}

/**
 * What a migration's SQL creates.
 *
 * Deliberately only CREATE TABLE and ADD COLUMN: those are the statements whose
 * effect can be checked in information_schema without interpreting the rest.
 * Indexes and constraints follow their table, and a migration that only adds an
 * index is reported as `unknown` rather than guessed at.
 */
function typesOf(sql: string): string[] {
  return [...sql.matchAll(/CREATE TYPE\s+"([^"]+)"/gi)].map((m) => m[1]);
}

function expectationsOf(sql: string): Expectation[] {
  const byTable = new Map<string, Set<string>>();

  for (const m of sql.matchAll(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?"([^"]+)"/gi)) {
    if (!byTable.has(m[1])) byTable.set(m[1], new Set());
  }
  for (const m of sql.matchAll(/ALTER TABLE\s+"([^"]+)"\s+ADD COLUMN\s+(?:IF NOT EXISTS\s+)?"([^"]+)"/gi)) {
    const set = byTable.get(m[1]) ?? new Set<string>();
    set.add(m[2]);
    byTable.set(m[1], set);
  }

  return [...byTable].map(([table, columns]) => ({ table, columns: [...columns] }));
}

/**
 * Enum types matter as much as tables here. A migration whose type already
 * exists but whose table does not is exactly the half-applied state this is
 * meant to catch — and if it slipped through, `migrate deploy` would fail on
 * `type "X" already exists` in the middle of a production deploy.
 */
async function typeExists(name: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ n: bigint }[]>`
    SELECT count(*) AS n FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = ${name} AND n.nspname = current_schema()`;
  return Number(rows[0]?.n ?? 0) > 0;
}

async function exists(table: string, column?: string): Promise<boolean> {
  const rows = column
    ? await prisma.$queryRaw<{ n: bigint }[]>`
        SELECT count(*) AS n FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = ${table} AND column_name = ${column}`
    : await prisma.$queryRaw<{ n: bigint }[]>`
        SELECT count(*) AS n FROM information_schema.tables
        WHERE table_schema = current_schema() AND table_name = ${table}`;
  return Number(rows[0]?.n ?? 0) > 0;
}

async function main() {
  const database = url!.split("/").pop()?.split("?")[0];
  console.log(`Database: ${database}`);
  console.log(apply ? "Mode: APPLY\n" : "Mode: report only (pass --apply to act)\n");

  const alreadyTracked = await exists("_prisma_migrations");
  if (alreadyTracked) {
    const rows = await prisma.$queryRaw<{ migration_name: string }[]>`
      SELECT migration_name FROM "_prisma_migrations" ORDER BY migration_name`;
    console.log(
      `This database already has a migration history (${rows.length} recorded). ` +
        "Nothing to baseline — run `prisma migrate deploy`.",
    );
    await prisma.$disconnect();
    return;
  }

  const names = readdirSync(MIGRATIONS)
    .filter((n) => !n.startsWith(".") && n !== "migration_lock.toml")
    .sort();

  const verdicts: { name: string; state: string; detail: string }[] = [];

  for (const name of names) {
    const sql = readFileSync(path.join(MIGRATIONS, name, "migration.sql"), "utf8");
    const expectations = expectationsOf(sql);
    const types = typesOf(sql);

    if (expectations.length === 0 && types.length === 0) {
      verdicts.push({ name, state: "unknown", detail: "creates no table or column this can check" });
      continue;
    }

    const checks: { label: string; found: boolean }[] = [];
    for (const name of types) {
      checks.push({ label: `type ${name}`, found: await typeExists(name) });
    }
    for (const e of expectations) {
      if (e.columns.length === 0) {
        checks.push({ label: e.table, found: await exists(e.table) });
      } else {
        for (const c of e.columns) {
          checks.push({ label: `${e.table}.${c}`, found: await exists(e.table, c) });
        }
      }
    }

    const found = checks.filter((c) => c.found).length;
    const state = found === checks.length ? "present" : found === 0 ? "missing" : "partial";
    const detail =
      state === "partial"
        ? `${found}/${checks.length} — missing ${checks.filter((c) => !c.found).map((c) => c.label).join(", ")}`
        : `${found}/${checks.length} objects`;
    verdicts.push({ name, state, detail });
  }

  const width = Math.max(...verdicts.map((v) => v.name.length));
  for (const v of verdicts) {
    const mark = { present: "✓", missing: "→", partial: "!", unknown: "?" }[v.state] ?? "?";
    console.log(`  ${mark} ${v.name.padEnd(width)}  ${v.state.padEnd(8)} ${v.detail}`);
  }

  const partial = verdicts.filter((v) => v.state === "partial");
  const unknown = verdicts.filter((v) => v.state === "unknown");
  const present = verdicts.filter((v) => v.state === "present");
  const missing = verdicts.filter((v) => v.state === "missing");

  console.log(
    `\n${present.length} already in the database, ${missing.length} still to run` +
      (partial.length ? `, ${partial.length} half-applied` : "") +
      (unknown.length ? `, ${unknown.length} unreadable` : "") +
      ".",
  );

  if (partial.length) {
    console.log(
      "\nStop. A half-applied migration means the database is in a state no migration\n" +
        "describes. Look at it by hand before baselining — marking it applied would\n" +
        "hide the missing half for ever.",
    );
    await prisma.$disconnect();
    process.exit(2);
  }

  // A migration that creates nothing checkable, sitting before ones that are
  // clearly present, is part of the same history and rides along with them.
  const lastPresent = verdicts.map((v) => v.state).lastIndexOf("present");
  const toMark = verdicts
    .filter((v, i) => v.state === "present" || (v.state === "unknown" && i < lastPresent))
    .map((v) => v.name);

  if (toMark.length === 0) {
    console.log("\nNothing to mark. This database is empty enough for `migrate deploy` to run.");
    await prisma.$disconnect();
    return;
  }

  if (!apply) {
    console.log("\nWould mark as already applied:");
    for (const name of toMark) console.log(`  prisma migrate resolve --applied ${name}`);
    console.log("\nRe-run with --apply to do it, then deploy.");
    await prisma.$disconnect();
    return;
  }

  for (const name of toMark) {
    process.stdout.write(`  marking ${name} … `);
    execFileSync("npx", ["prisma", "migrate", "resolve", "--applied", name], {
      cwd: path.join(__dirname, ".."),
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    });
    console.log("done");
  }

  console.log(
    `\nBaselined. ${missing.length} migration${missing.length === 1 ? "" : "s"} left for ` +
      "`prisma migrate deploy`, which the next deployment runs on its own.",
  );
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
