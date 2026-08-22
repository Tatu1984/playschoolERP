import { defineConfig, devices } from "@playwright/test";

/**
 * Browser tests for the four paths that must never break.
 *
 * Everything else in this repository is tested below the browser: 239
 * integration assertions against real Postgres, and unit suites for the parts
 * that are pure. What none of them can prove is that a parent can actually
 * sign in — that the form posts, the cookie comes back, the proxy lets them
 * through, and the portal renders. Every one of those has broken at some point
 * in a way no server-side test would have noticed.
 *
 * Run with `npm run e2e`. It builds and starts the app itself, against the
 * seeded development database.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  // Resets the login rate limiter and mints one session per role — see the file
  // for why both are necessary.
  globalSetup: "./tests/e2e/global-setup.ts",
  // A school portal is not a race: the tests are written to wait for what they
  // need rather than to sleep, so a generous timeout costs nothing when things
  // work and explains itself when they do not.
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // Serial on purpose. These share one seeded database, and a test that pays an
  // invoice while another reads the same invoice is a flake nobody enjoys.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3210",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        // Production build, not `next dev`: the dev server's error overlay and
        // hot reload hide exactly the kind of hydration problem this is for.
        command: "npm run build && npx next start -p 3210",
        url: "http://localhost:3210/login",
        reuseExistingServer: !process.env.CI,
        timeout: 300_000,
      },
});
