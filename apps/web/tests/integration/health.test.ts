/**
 * Run with `npm run check:health`. Needs the database up.
 *
 * The point of a health check is to be trusted by something that will act on
 * it — a load balancer taking an instance out, an alert waking someone. So the
 * thing worth testing is that it reports the database honestly rather than
 * reporting that the process is running, which was never in doubt.
 */
import "dotenv/config";
import { GET } from "../../src/app/api/health/route";
import { prisma } from "../../src/backend/database/client";

let pass = 0;
let fail = 0;
function check(label: string, ok: boolean, detail = "") {
  if (ok) {
    pass++;
    console.log(`  ✓ ${label}`);
  } else {
    fail++;
    console.log(`  ✗ ${label} ${detail}`);
  }
}

async function main() {
  const res = await GET();
  const body = (await res.json()) as Record<string, unknown>;

  console.log("\nHealth — with a database that is up");
  check("answers 200", res.status === 200, `— got ${res.status}`);
  check("says ok", body.status === "ok", `— got ${body.status}`);
  check("reports the database up", body.database === "up");
  check("reports how long the database took", typeof body.databaseLatencyMs === "number");
  check("names the payment driver", typeof body.payments === "string");
  check("is never cached", res.headers.get("cache-control") === "no-store");

  // Nothing here may help a stranger: no connection strings, no versions, no
  // error text. The endpoint is public.
  const text = JSON.stringify(body);
  check("leaks no connection string", !text.includes("postgres"));
  check("leaks no credentials", !/password|secret/i.test(text));

  console.log(`\n${pass} passed, ${fail} failed\n`);
  await prisma.$disconnect();
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
