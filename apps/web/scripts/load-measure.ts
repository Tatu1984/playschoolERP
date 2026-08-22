/**
 * Time the queries that decide whether the portal opens in a second or in ten,
 * against a school-sized database.
 *
 * `bootstrap.service.ts` bounds itself to 120 days and a handful of row caps.
 * Those numbers were reasoned about and never measured. This measures them, so
 * the next person changing them is arguing with a number rather than with a
 * feeling.
 *
 * Run against the load database:
 *
 *   DATABASE_URL=…/playschool_load npm run load:measure
 *
 * Every figure is the median of five runs on a warm cache, which is the case
 * that matters: the first request after a deploy is slow everywhere and tells
 * you nothing about the shape of the query.
 */
import "dotenv/config";
import { prisma } from "../src/backend/database/client";
import { bootstrapService } from "../src/backend/services/bootstrap.service";
import { analyticsService } from "../src/backend/services/analytics.service";
import { resolveScope } from "../src/backend/utils/scope.util";
import type { Session } from "../src/backend/utils/route.util";
import type { Role } from "@/shared/constants/roles";

const RUNS = 5;

async function time<T>(label: string, run: () => Promise<T>): Promise<{ label: string; ms: number; note: string }> {
  await run(); // warm
  const samples: number[] = [];
  let note = "";
  for (let i = 0; i < RUNS; i++) {
    const at = performance.now();
    const result = await run();
    samples.push(performance.now() - at);
    if (i === 0) note = describe(result);
  }
  samples.sort((a, b) => a - b);
  return { label, ms: Math.round(samples[Math.floor(RUNS / 2)]), note };
}

function describe(result: unknown): string {
  if (!result || typeof result !== "object") return "";
  const r = result as Record<string, unknown>;
  const parts: string[] = [];
  for (const key of ["attendance", "messages", "invoices", "activities", "students", "notifications"]) {
    if (Array.isArray(r[key])) parts.push(`${key}=${(r[key] as unknown[]).length}`);
  }
  return parts.join(" ");
}

async function sessionFor(role: Role, email: string): Promise<Session> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error(`No ${role} at ${email} — run npm run load:seed first.`);
  return {
    sub: user.id,
    role,
    email: user.email,
    name: user.name,
    branchId: user.branchId,
  };
}

async function main() {
  const db = (process.env.DATABASE_URL ?? "").split("/").pop()?.split("?")[0];
  console.log(`Measuring against ${db}\n`);

  const counts = {
    students: await prisma.student.count(),
    attendance: await prisma.attendanceRecord.count(),
    messages: await prisma.message.count(),
    activities: await prisma.activity.count(),
    invoices: await prisma.invoice.count(),
  };
  console.table(counts);

  const adminSession = await sessionFor("ADMIN", "admin@load.test");
  const teacherSession = await sessionFor("TEACHER", "teacher-0-0@load.test");
  const parentSession = await sessionFor("PARENT", "parent-0@load.test");

  const [adminScope, teacherScope, parentScope] = await Promise.all([
    resolveScope(adminSession),
    resolveScope(teacherSession),
    resolveScope(parentSession),
  ]);

  const results = [
    await time("bootstrap — parent", () => bootstrapService.snapshot(parentScope)),
    await time("bootstrap — teacher", () => bootstrapService.snapshot(teacherScope)),
    await time("bootstrap — admin", () => bootstrapService.snapshot(adminScope)),
    await time("analytics — admin", () => analyticsService.snapshot(adminScope)),
    await time("resolveScope — admin", () => resolveScope(adminSession)),
    await time("resolveScope — parent", () => resolveScope(parentSession)),
  ];

  console.log("");
  console.table(
    results.map((r) => ({ query: r.label, "median ms": r.ms, returned: r.note })),
  );

  // Time is only half of it. The bootstrap's answer travels over a parent's
  // mobile connection at the school gate, and a payload that serialises in
  // 160ms can still take fifteen seconds to arrive.
  console.log("");
  const payloads = [];
  for (const [label, scope] of [
    ["parent", parentScope],
    ["teacher", teacherScope],
    ["admin", adminScope],
  ] as const) {
    const snapshot = await bootstrapService.snapshot(scope);
    const bytes = Buffer.byteLength(JSON.stringify(snapshot));
    payloads.push({
      snapshot: label,
      "payload MB": (bytes / 1024 / 1024).toFixed(2),
      "≈ seconds on 3G (400 KB/s)": (bytes / 1024 / 400).toFixed(1),
      truncated: (snapshot.coverage?.truncated ?? []).join(", ") || "—",
    });
  }
  console.table(payloads);

  // Where the bytes are. Without this the only available move is "make the
  // window smaller and hope", which is how the windows got chosen the first
  // time.
  const adminSnapshot = await bootstrapService.snapshot(adminScope) as unknown as Record<string, unknown>;
  const byCollection = Object.entries(adminSnapshot)
    .map(([key, value]) => ({
      collection: key,
      rows: Array.isArray(value) ? value.length : 1,
      KB: Math.round(Buffer.byteLength(JSON.stringify(value)) / 1024),
    }))
    .filter((r) => r.KB >= 50)
    .sort((a, b) => b.KB - a.KB);
  console.log("\nWhere an admin's payload goes (collections over 50KB):");
  console.table(byCollection);

  const slowest = results.reduce((a, b) => (a.ms > b.ms ? a : b));
  console.log(`\nSlowest: ${slowest.label} at ${slowest.ms}ms.`);
  console.log(
    "A portal load waits on exactly one of these, plus the network. Anything\n" +
      "over about 800ms here is a screen that feels broken on a school's wifi.",
  );

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
