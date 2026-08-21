/**
 * Run with `npm run check:logger`. No database needed.
 *
 * A logger is an easy thing to trust and a bad thing to be wrong about. The two
 * failures worth testing for:
 *
 *  * It leaks. Somebody logs a request body while chasing a bug, the line stays
 *    in, and a year later a child's medical notes and a parent's phone number
 *    are sitting in a log aggregator that half the company can search. The
 *    redaction here is what stops that, so it is tested against the shapes it
 *    would actually be handed.
 *
 *  * It throws away the error. `${err}` loses the stack and the cause, and the
 *    stack is the only part worth having when something breaks at 3am.
 */
import { execFileSync } from "node:child_process";
import path from "node:path";
import { logger, setErrorReporter } from "../../src/backend/utils/logger.util";

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

/**
 * Outside production the logger hands its redacted fields to console as an
 * object, so capturing the call is enough to see exactly what would have been
 * written. Nothing about the redaction rules is restated here.
 */
function captureFields(run: () => void): Record<string, unknown> {
  const original = { log: console.log, warn: console.warn, error: console.error };
  let captured: Record<string, unknown> = {};
  const grab = (_msg?: unknown, fields?: unknown) => {
    captured = (typeof fields === "object" && fields !== null ? fields : {}) as Record<string, unknown>;
  };
  console.log = grab;
  console.warn = grab;
  console.error = grab;
  try {
    run();
  } finally {
    console.log = original.log;
    console.warn = original.warn;
    console.error = original.error;
  }
  return captured;
}

console.log("\nRedaction — what must never reach a log line");
{
  const fields = captureFields(() =>
    logger.info("enrolment", {
      password: "hunter2",
      passwordHash: "$2a$12$abcdef",
      authorization: "Bearer abc.def.ghi",
      sessionToken: "eyJhbGciOi",
      email: "parent@example.com",
      phone: "+91 98000 00000",
      childDob: "2022-04-01",
      medicalNotes: "peanut allergy",
      allergies: ["peanuts"],
      studentId: "stu_aarav",
      count: 3,
    }),
  );

  for (const key of [
    "password",
    "passwordHash",
    "authorization",
    "sessionToken",
    "email",
    "phone",
    "childDob",
    "medicalNotes",
    "allergies",
  ]) {
    check(`${key} is redacted`, fields[key] === "[redacted]", `— got ${JSON.stringify(fields[key])}`);
  }

  // Redaction that eats everything is its own failure: a log with no facts in
  // it cannot answer anything.
  check("a non-identifying id survives", fields.studentId === "stu_aarav");
  check("a plain number survives", fields.count === 3);
}

console.log("\nRedaction reaches nested values, not just the top level");
{
  const fields = captureFields(() =>
    logger.warn("webhook", { payload: { notes: { email: "a@b.c" }, orderId: "order_1" } }),
  );
  const payload = fields.payload as { notes: { email: unknown }; orderId: unknown };
  check("a nested email is redacted", payload.notes.email === "[redacted]");
  check("a nested id survives", payload.orderId === "order_1");
}

console.log("\nCyclic and deep structures do not hang the request");
{
  const cyclic: Record<string, unknown> = { name: "loop" };
  cyclic.self = cyclic;
  let threw = false;
  try {
    captureFields(() => logger.info("cyclic", { cyclic }));
  } catch {
    threw = true;
  }
  check("a cyclic object is handled rather than thrown on", !threw);
}

console.log("\nErrors keep the parts worth having");
{
  const cause = new Error("connection refused");
  const err = new Error("could not load invoices", { cause });
  const fields = captureFields(() => logger.error("boom", err, { invoiceId: "inv_1" }));
  const logged = fields.error as { name: string; message: string; stack?: string; cause?: { message: string } };
  check("the message survives", logged?.message === "could not load invoices");
  check("the stack survives", typeof logged?.stack === "string" && logged.stack.length > 0);
  check("the cause survives", logged?.cause?.message === "connection refused");
  check("other fields ride along", fields.invoiceId === "inv_1");
}

console.log("\nThe error reporter seam");
{
  let reported: unknown = null;
  setErrorReporter((err) => {
    reported = err;
  });
  const err = new Error("tracked");
  captureFields(() => logger.error("boom", err));
  check("an error tracker receives the error", reported === err);

  // A broken tracker must not become the outage.
  setErrorReporter(() => {
    throw new Error("the tracker itself is down");
  });
  let threw = false;
  try {
    captureFields(() => logger.error("boom", new Error("x")));
  } catch {
    threw = true;
  }
  check("a throwing tracker does not take the request with it", !threw);
  setErrorReporter(null);
}

console.log("\nIn production every entry is one line of JSON");
{
  const probe = path.join(import.meta.dirname, "fixtures", "logger-prod-probe.ts");
  const out = execFileSync("npx", ["tsx", probe], {
    cwd: path.resolve(import.meta.dirname, "..", ".."),
    encoding: "utf8",
    env: {
      PATH: process.env.PATH ?? "",
      HOME: process.env.HOME ?? "",
      NODE_ENV: "production" as const,
      AUTH_SECRET: "t",
      CCTV_TOKEN_SECRET: "t",
      CCTV_INTERNAL_SECRET: "t",
    },
    stdio: ["ignore", "pipe", "pipe"] as const,
  });

  const lines = out.trim().split("\n").filter(Boolean);
  const parsed = lines.map((l) => {
    try {
      return JSON.parse(l) as Record<string, unknown>;
    } catch {
      return null;
    }
  });
  check("every line parses as JSON", parsed.every((p) => p !== null), `— ${out.trim()}`);

  const entry = parsed.find((p) => p?.message === "invoice settled");
  check("the level is a field", entry?.level === "info");
  check("the time is a field", typeof entry?.time === "string");
  check("secrets are still redacted in production", entry?.password === "[redacted]");
  check("ordinary fields are present", entry?.invoiceId === "inv_9");
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
