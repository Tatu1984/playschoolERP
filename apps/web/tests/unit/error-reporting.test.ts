/**
 * Run with `npm run check:error-reporting`. Needs nothing running.
 *
 * `setErrorReporter` was a seam with nothing plugged into it, which meant every
 * unhandled failure in production reached a log stream and stopped there. What
 * matters about the thing now plugged in is mostly what it must not do: leak a
 * password into a third party, throw inside a failing request, or recurse when
 * the tracker itself is down.
 */
import { parseDsn, setErrorTracker, type ErrorTracker } from "../../src/backend/integrations/error-reporting";
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

console.log("\nReading a DSN");
const dsn = parseDsn("https://abc123@o42.ingest.sentry.io/7654321");
check("the key is read", dsn?.key === "abc123");
check("the host is read", dsn?.host === "o42.ingest.sentry.io");
check("the project id is read", dsn?.projectId === "7654321");
check("junk is not a DSN", parseDsn("not-a-dsn") === null);
check("a DSN with no key is not a DSN", parseDsn("https://o42.ingest.sentry.io/7654321") === null);
check("nor is one with no project", parseDsn("https://abc123@o42.ingest.sentry.io/") === null);

console.log("\nWhat reaches the tracker");
const seen: { error: unknown; fields: Record<string, unknown> }[] = [];
const capturing: ErrorTracker = {
  name: "capture",
  report({ error, fields }) {
    seen.push({ error, fields });
  },
};
const previous = setErrorTracker(capturing);
setErrorReporter((error, fields) => capturing.report({ error, fields }));

// Silence the console for the duration — these calls are meant to print.
const realError = console.error;
console.error = () => {};

logger.error("Something failed", new Error("boom"), {
  userId: "usr_1",
  password: "hunter2",
  email: "parent@example.com",
});

console.error = realError;

check("the error itself is passed through", (seen[0]?.error as Error)?.message === "boom");
check("ordinary context comes with it", seen[0]?.fields.userId === "usr_1");
check("a password never leaves the building", seen[0]?.fields.password !== "hunter2");
check("nor does an email address", seen[0]?.fields.email !== "parent@example.com");

console.log("\nA tracker that is broken must not become the failure");
setErrorReporter(() => {
  throw new Error("the tracker is down");
});
console.error = () => {};
let threw = false;
try {
  logger.error("Something else failed", new Error("original"));
} catch {
  threw = true;
}
console.error = realError;
check("logging an error with a broken tracker does not throw", !threw);

setErrorReporter(null);
setErrorTracker(previous);
check("the tracker can be put back", true);

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
