/**
 * Working out what an existing database already has, without trusting a guess.
 *
 * Shared by the `db:baseline` command (a person, looking) and the deploy
 * wrapper (a build, acting on an explicit opt-in). Both need the same answer to
 * the same question: for each migration, are the things it creates already
 * there?
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import type { PrismaClient } from "../../src/backend/database/generated";

export const MIGRATIONS_DIR = path.join(__dirname, "../../src/backend/database/prisma/migrations");

export type State = "present" | "missing" | "partial" | "unknown";

export interface Verdict {
  name: string;
  state: State;
  detail: string;
}

interface Expectation {
  table: string;
  /** Empty means "the table itself", otherwise the columns it must have. */
  columns: string[];
}

function typesOf(sql: string): string[] {
  return [...sql.matchAll(/CREATE TYPE\s+"([^"]+)"/gi)].map((m) => m[1]);
}

/**
 * What a migration's SQL creates.
 *
 * Deliberately only CREATE TYPE, CREATE TABLE and ADD COLUMN: those are the
 * statements whose effect can be checked without interpreting the rest.
 * Indexes and constraints follow their table, and a migration that only adds an
 * index is reported as `unknown` rather than guessed at.
 */
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

export function migrationNames(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((n) => !n.startsWith(".") && n !== "migration_lock.toml")
    .sort();
}

/** Number of recorded migrations, or null when the table does not exist. */
export async function migrationHistory(prisma: PrismaClient): Promise<number | null> {
  const rows = await prisma.$queryRaw<{ n: bigint }[]>`
    SELECT count(*) AS n FROM information_schema.tables
    WHERE table_schema = current_schema() AND table_name = '_prisma_migrations'`;
  if (Number(rows[0]?.n ?? 0) === 0) return null;
  const applied = await prisma.$queryRaw<{ n: bigint }[]>`
    SELECT count(*) AS n FROM "_prisma_migrations"`;
  return Number(applied[0]?.n ?? 0);
}

/**
 * Enum types matter as much as tables. A migration whose type already exists
 * but whose table does not is exactly the half-applied state this is meant to
 * catch — and if it slipped through, `migrate deploy` would fail on
 * `type "X" already exists` in the middle of a production deploy.
 */
async function typeExists(prisma: PrismaClient, name: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ n: bigint }[]>`
    SELECT count(*) AS n FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = ${name} AND n.nspname = current_schema()`;
  return Number(rows[0]?.n ?? 0) > 0;
}

async function exists(prisma: PrismaClient, table: string, column?: string): Promise<boolean> {
  const rows = column
    ? await prisma.$queryRaw<{ n: bigint }[]>`
        SELECT count(*) AS n FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = ${table} AND column_name = ${column}`
    : await prisma.$queryRaw<{ n: bigint }[]>`
        SELECT count(*) AS n FROM information_schema.tables
        WHERE table_schema = current_schema() AND table_name = ${table}`;
  return Number(rows[0]?.n ?? 0) > 0;
}

/** One verdict per migration, in order. */
export async function inspect(prisma: PrismaClient): Promise<Verdict[]> {
  const verdicts: Verdict[] = [];

  for (const name of migrationNames()) {
    const sql = readFileSync(path.join(MIGRATIONS_DIR, name, "migration.sql"), "utf8");
    const expectations = expectationsOf(sql);
    const types = typesOf(sql);

    if (expectations.length === 0 && types.length === 0) {
      verdicts.push({ name, state: "unknown", detail: "creates no table, column or type this can check" });
      continue;
    }

    const checks: { label: string; found: boolean }[] = [];
    for (const t of types) checks.push({ label: `type ${t}`, found: await typeExists(prisma, t) });
    for (const e of expectations) {
      if (e.columns.length === 0) {
        checks.push({ label: e.table, found: await exists(prisma, e.table) });
      } else {
        for (const c of e.columns) {
          checks.push({ label: `${e.table}.${c}`, found: await exists(prisma, e.table, c) });
        }
      }
    }

    const found = checks.filter((c) => c.found).length;
    const state: State = found === checks.length ? "present" : found === 0 ? "missing" : "partial";
    const detail =
      state === "partial"
        ? `${found}/${checks.length} — missing ${checks.filter((c) => !c.found).map((c) => c.label).join(", ")}`
        : `${found}/${checks.length} objects`;
    verdicts.push({ name, state, detail });
  }

  return verdicts;
}

/**
 * Which migrations may safely be recorded as already applied.
 *
 * A migration that creates nothing checkable, sitting before ones that are
 * clearly present, is part of the same history and rides along with them.
 */
export function markable(verdicts: Verdict[]): string[] {
  const lastPresent = verdicts.map((v) => v.state).lastIndexOf("present");
  return verdicts
    .filter((v, i) => v.state === "present" || (v.state === "unknown" && i < lastPresent))
    .map((v) => v.name);
}

export function render(verdicts: Verdict[]): string {
  const width = Math.max(...verdicts.map((v) => v.name.length));
  const mark: Record<State, string> = { present: "✓", missing: "→", partial: "!", unknown: "?" };
  return verdicts
    .map((v) => `  ${mark[v.state]} ${v.name.padEnd(width)}  ${v.state.padEnd(8)} ${v.detail}`)
    .join("\n");
}
