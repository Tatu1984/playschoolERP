/**
 * Run with `npm run check:coverage-note`. Needs nothing running.
 *
 * The portal loads a term, not a school's whole history, so every total on
 * screen is a total within a window. "Absent 4 times" means four times since
 * May. A screen that renders it as though it meant four times ever is wrong in
 * a way no bug report will ever describe, because it looks perfectly fine.
 *
 * This is the function each screen asks before deciding whether to say so.
 */
import { coverageFor } from "../../src/frontend/hooks/useCoverage";
import type { SnapshotCoverage } from "../../src/frontend/store/erpStore";

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

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

const windowed: SnapshotCoverage = {
  since: daysAgo(120),
  windowed: ["attendance", "messages"],
  truncated: [],
};

console.log("\nA windowed snapshot");
const attendance = coverageFor(windowed, "attendance");
check("attendance is windowed", attendance.windowed);
check("and the window is about 120 days", Math.abs(attendance.days - 120) <= 1, `— ${attendance.days}`);
check("with a real date behind it", attendance.since instanceof Date);
check("nothing was truncated", !attendance.truncated);

const invoices = coverageFor(windowed, "invoices");
check("invoices are not windowed — they are complete", !invoices.windowed);
check("and so say nothing", !invoices.windowed && !invoices.truncated);

console.log("\nWhen a cap was hit");
const capped = coverageFor(
  { ...windowed, truncated: ["messages", "invoices"] },
  "invoices",
);
check("a capped collection reports it", capped.truncated);
check("even though it is not windowed", !capped.windowed);
const both = coverageFor({ ...windowed, truncated: ["attendance"] }, "attendance");
check("a collection can be both windowed and capped", both.windowed && both.truncated);

console.log("\nWhen there is no server behind the store");
// The demo fixtures are the whole of their own little world: labelling them
// "the last 120 days" would be its own kind of lie.
const none = coverageFor(null, "attendance");
check("nothing is windowed", !none.windowed);
check("nothing is truncated", !none.truncated);
check("and there is no date to show", none.since === null);
check("nor a day count", none.days === 0);

console.log("\nA coverage payload that makes no sense");
const broken = coverageFor(
  { since: "not-a-date", windowed: ["attendance"], truncated: [] },
  "attendance",
);
check("an unparseable date does not become an Invalid Date on screen", broken.since === null);
check("and the screen is not told it is windowed with no window", !broken.windowed);

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
