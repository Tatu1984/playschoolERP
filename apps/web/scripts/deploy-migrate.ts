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
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/backend/database/generated";
import { inspect, markable, render } from "./lib/baseline";

const HERE = path.join(__dirname, "..");
const OPTED_IN = /^(1|true|yes)$/i.test(process.env.BASELINE_ON_DEPLOY ?? "");

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
    console.log(
      "\nA half-applied migration is a state no migration describes. Baselining\n" +
        "past it would hide the missing half for ever, so this stops here even if\n" +
        "BASELINE_ON_DEPLOY is set. Somebody needs to look at the database.",
    );
    process.exit(1);
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
