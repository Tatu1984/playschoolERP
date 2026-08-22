import { request } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "../../src/backend/database/client";

/**
 * Two jobs before any browser opens.
 *
 * **Clear the login rate limiter.** Signing in six times from one address in a
 * minute is precisely what `LOGIN_IP_LIMIT` exists to stop, and it stopped this
 * suite — correctly. The fix is not to loosen the limit for everybody; it is to
 * reset the counter here, and to sign in once per role rather than once per
 * test. If a change ever makes these tests hit the limit again, that is worth
 * knowing rather than working around.
 *
 * **Mint a session per role.** Each test then starts already signed in, which
 * keeps the sign-in path tested in exactly one place — auth.spec.ts, where it
 * is the subject rather than a prerequisite.
 */
export const STATE_DIR = path.join(process.cwd(), "tests/e2e/.auth");

const ROLES = [
  { name: "parent", email: "parent@example.com" },
  { name: "teacher", email: "meera@climbkiddo.in" },
  { name: "admin", email: "admin@climbkiddo.in" },
];

export default async function globalSetup() {
  const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3210";

  await prisma.rateLimit.deleteMany({
    where: { bucket: { in: ["login-ip", "login-email", "public-form"] } },
  });
  await prisma.$disconnect();

  await mkdir(STATE_DIR, { recursive: true });

  for (const role of ROLES) {
    const context = await request.newContext({ baseURL });
    const res = await context.post("/api/auth/login", {
      data: { email: role.email, password: "password12345" },
    });
    if (!res.ok()) {
      throw new Error(
        `Could not sign in as ${role.name} (${res.status()}). Is the database seeded? ` +
          `Run npm run db:seed.`,
      );
    }
    await context.storageState({ path: path.join(STATE_DIR, `${role.name}.json`) });
    await context.dispose();
  }

  // Written so a failing run leaves an obvious trail rather than a mystery.
  await writeFile(
    path.join(STATE_DIR, "README.txt"),
    "Session cookies for the e2e suite, minted by global-setup.ts. Disposable.\n",
  );
}
