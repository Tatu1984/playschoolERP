/**
 * Teach an existing database its own migration history.
 *
 * A database created with `prisma db push` has the schema and no record of how
 * it got there, so `prisma migrate deploy` refuses it (P3005 — "the database
 * schema is not empty"). That refusal is the check that stops a migration tool
 * running against a database whose history it cannot see.
 *
 * The dangerous way to baseline is to mark every migration applied and hope. If
 * the database is actually behind, those migrations are lost for good and the
 * first request touching a missing column is a 500 nobody can explain. So this
 * looks first — see scripts/lib/baseline.ts for what "looking" means.
 *
 *   npm run db:baseline             # report only, changes nothing
 *   npm run db:baseline -- --apply  # mark what is already there as applied
 *
 * `--apply` never runs migration SQL. `prisma migrate deploy` does that
 * afterwards, in the ordinary way, for the migrations genuinely missing.
 */
import "dotenv/config";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/backend/database/generated";
import { inspect, markable, migrationHistory, render } from "./lib/baseline";

const apply = process.argv.includes("--apply");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Point it at the database you mean to baseline.");
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

async function main() {
  console.log(`Database: ${url!.split("/").pop()?.split("?")[0]}`);
  console.log(apply ? "Mode: APPLY\n" : "Mode: report only (pass --apply to act)\n");

  const recorded = await migrationHistory(prisma);
  if (recorded !== null) {
    console.log(
      `This database already has a migration history (${recorded} recorded). ` +
        "Nothing to baseline — run `prisma migrate deploy`.",
    );
    await prisma.$disconnect();
    return;
  }

  const verdicts = await inspect(prisma);
  console.log(render(verdicts));

  const count = (s: string) => verdicts.filter((v) => v.state === s).length;
  console.log(
    `\n${count("present")} already in the database, ${count("missing")} still to run` +
      (count("partial") ? `, ${count("partial")} half-applied` : "") +
      (count("unknown") ? `, ${count("unknown")} unreadable` : "") +
      ".",
  );

  if (count("partial")) {
    console.log(
      "\nStop. A half-applied migration means the database is in a state no migration\n" +
        "describes. Look at it by hand before baselining — marking it applied would\n" +
        "hide the missing half for ever.",
    );
    await prisma.$disconnect();
    process.exit(2);
  }

  const toMark = markable(verdicts);
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

  const left = count("missing");
  console.log(
    `\nBaselined. ${left} migration${left === 1 ? "" : "s"} left for ` +
      "`prisma migrate deploy`, which the next deployment runs on its own.",
  );
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
