/**
 * Run with `npm run check:payments`. No database needed.
 *
 * Which payment driver gets built is decided once, at import, from the
 * environment — so the only honest way to test it is to import the module again
 * under a different environment. Each case below boots a real child process
 * with real env vars and asks the module which driver it chose.
 *
 * What this is guarding: the mock driver used to be the fallback everywhere,
 * including production. Deploy without Razorpay configured and the mock was
 * live, which meant `/api/fees/mock-settle` would happily mark a parent's own
 * invoice paid — no money, no gateway, no trace. A school would have no way to
 * notice, because a mocked payment looks exactly like a real one on every
 * screen.
 */
import { execFileSync } from "node:child_process";
import path from "node:path";

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

const webRoot = path.resolve(import.meta.dirname, "..", "..");

/** Node's own three environments — `env.ts` only treats one of them as live. */
type NodeEnv = "production" | "development" | "test";

/** The secrets env.ts insists on in production, so we test payments not those. */
const PROD_BASE = {
  NODE_ENV: "production" as NodeEnv,
  AUTH_SECRET: "test-auth-secret",
  CCTV_TOKEN_SECRET: "test-cctv-secret",
  CCTV_INTERNAL_SECRET: "test-internal-secret",
};

/**
 * Boot the module under `vars` and report the driver name, or the boot error.
 * `NODE_ENV` is required rather than defaulted: it is the variable under test in
 * half these cases, so no case may leave it to chance.
 */
function driverUnder(vars: { NODE_ENV: NodeEnv } & Record<string, string>): string {
  const probe = path.join(webRoot, "tests", "unit", "fixtures", "payment-driver-probe.ts");
  try {
    const out = execFileSync("npx", ["tsx", probe], {
      cwd: webRoot,
      encoding: "utf8",
      // A clean environment: inherit PATH but none of the developer's own keys,
      // or a local .env would decide the answer instead of the test.
      env: { PATH: process.env.PATH ?? "", HOME: process.env.HOME ?? "", ...vars },
      stdio: ["ignore", "pipe", "pipe"] as const,
    });
    const line = out.split("\n").find((l) => l.startsWith("DRIVER:"));
    return line ? line.slice("DRIVER:".length).trim() : `NO DRIVER LINE: ${out.trim()}`;
  } catch (e) {
    // A refusal to boot is a result, not a test error — report its message.
    const err = e as { stderr?: string; message?: string };
    return `THREW: ${err.stderr ?? err.message ?? String(e)}`;
  }
}

console.log("\nDevelopment — the mock is a convenience, and stays available");
check("no gateway configured in dev gives the mock", driverUnder({ NODE_ENV: "development" as NodeEnv }) === "mock");

console.log("\nProduction — the mock must be unreachable");
const prodUnconfigured = driverUnder(PROD_BASE);
check(
  "no gateway configured in production is switched off, not mocked",
  prodUnconfigured === "disabled",
  `— got ${prodUnconfigured}`,
);

const prodConfigured = driverUnder({
  ...PROD_BASE,
  RAZORPAY_KEY_ID: "rzp_live_xxx",
  RAZORPAY_KEY_SECRET: "secret",
  RAZORPAY_WEBHOOK_SECRET: "webhook-secret",
});
check(
  "a fully configured production gateway is the real one",
  prodConfigured === "razorpay",
  `— got ${prodConfigured}`,
);

console.log("\nHalf-configured — keys without a webhook secret");
// The webhook is the only thing that may mark an invoice paid. Verifying it
// against a fallback constant published in the repo would let anyone forge a
// `payment.captured`, so a half-configured gateway must refuse to start.
const prodHalf = driverUnder({
  ...PROD_BASE,
  RAZORPAY_KEY_ID: "rzp_live_xxx",
  RAZORPAY_KEY_SECRET: "secret",
});
check(
  "production refuses to boot without RAZORPAY_WEBHOOK_SECRET",
  prodHalf.startsWith("THREW:") && prodHalf.includes("RAZORPAY_WEBHOOK_SECRET"),
  `— got ${prodHalf}`,
);

const devHalf = driverUnder({
  NODE_ENV: "development" as NodeEnv,
  RAZORPAY_KEY_ID: "rzp_test_xxx",
  RAZORPAY_KEY_SECRET: "secret",
});
check(
  "dev with half a gateway switches payments off rather than guessing a secret",
  devHalf === "disabled",
  `— got ${devHalf}`,
);

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
