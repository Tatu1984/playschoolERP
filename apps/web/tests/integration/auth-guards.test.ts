/**
 * Run with `npm run check:auth-guards`. Needs the seeded database up.
 *
 * Two things that are easy to believe are working and hard to notice are not:
 *
 *  * Revocation. The session cookie is a stateless JWT good for a week, so
 *    disabling an account or demoting an admin changes a row and nothing else.
 *    Until this was fixed, the holder carried on with the rights they had when
 *    they signed in, for up to seven days, and no screen would have shown it.
 *
 *  * Rate limiting. The counter lives in Postgres precisely because an
 *    in-process one would silently count almost nothing on serverless. A test
 *    that never crosses the limit would pass against a limiter that does not
 *    work at all, so these cross it.
 */
import "dotenv/config";
import { prisma } from "../../src/backend/database/client";
import { signSession } from "../../src/backend/utils/jwt.util";
import { revokeSessions, sessionStillHolds } from "../../src/backend/services/auth.service";
import {
  clearRateLimit,
  enforceRateLimit,
  pruneRateLimits,
  type RateLimit,
} from "../../src/backend/utils/rate-limit.util";
import { verifySession } from "../../src/backend/utils/jwt.util";
import { ROLES } from "@/shared/constants/roles";

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
 * `getSession` reads the cookie jar, which only exists inside a request, so the
 * token is verified here and handed to the real predicate. Nothing about the
 * rule is restated in this file — a test that reimplements the logic it is
 * checking can only prove the two copies agree.
 */
async function sessionSurvives(token: string): Promise<boolean> {
  const claims = await verifySession(token);
  if (!claims) return false;
  return sessionStillHolds(claims);
}

/**
 * Wait until the wall clock has moved into a later second.
 *
 * A JWT's `iat` has one-second resolution, so a token signed and revoked inside
 * the same second is genuinely ambiguous — and is resolved in the holder's
 * favour on purpose, so that signing straight back in after "sign out
 * everywhere" works. Crossing the boundary is what makes the two cases below
 * distinguishable rather than a race.
 */
function nextSecond(): Promise<void> {
  const startSecond = Math.floor(Date.now() / 1000);
  return new Promise((resolve) => {
    const tick = () => {
      if (Math.floor(Date.now() / 1000) > startSecond) resolve();
      else setTimeout(tick, 50);
    };
    tick();
  });
}

async function main() {
  const user = await prisma.user.findFirst({ where: { role: ROLES.PARENT, active: true } });
  if (!user) throw new Error("Seed the database first — need an active parent login.");

  const originalValidFrom = user.sessionsValidFrom;
  const token = await signSession({
    sub: user.id,
    role: user.role,
    email: user.email,
    name: user.name,
    branchId: user.branchId,
  });

  try {
    console.log("\nRevocation — a signed token is not the last word");
    check("an account that has never revoked anything starts null", originalValidFrom === null);
    check("a fresh session is accepted", await sessionSurvives(token));

    await prisma.user.update({ where: { id: user.id }, data: { active: false } });
    check("disabling the account refuses the session it already held", !(await sessionSurvives(token)));

    await prisma.user.update({ where: { id: user.id }, data: { active: true } });
    check("re-enabling lets it back in", await sessionSurvives(token));

    // "Sign out everywhere", through the function the application actually
    // calls. The wait puts the revocation in a strictly later second than the
    // token, which is what the real sequence looks like anyway.
    await nextSecond();
    await revokeSessions(user.id);
    check("signing out everywhere refuses the old session", !(await sessionSurvives(token)));

    const reissued = await signSession({
      sub: user.id,
      role: user.role,
      email: user.email,
      name: user.name,
      branchId: user.branchId,
    });
    // A token signed after the cut-off must work, or "sign out everywhere"
    // would lock the account out of signing back in.
    check("a session issued afterwards is accepted", await sessionSurvives(reissued));
  } finally {
    await prisma.user.update({
      where: { id: user.id },
      data: { active: true, sessionsValidFrom: originalValidFrom },
    });
  }

  console.log("\nRate limiting — the counter is shared, and it counts");
  const LIMIT: RateLimit = { bucket: "test-bucket", max: 3, windowSeconds: 60 };
  const key = `test:${user.id}`;
  await clearRateLimit(LIMIT, key);

  try {
    let allowed = 0;
    let refused = 0;
    for (let i = 0; i < 5; i++) {
      try {
        await enforceRateLimit(LIMIT, key);
        allowed++;
      } catch {
        refused++;
      }
    }
    check("the first three attempts are allowed", allowed === 3, `— allowed ${allowed}`);
    check("the rest are refused", refused === 2, `— refused ${refused}`);

    // Concurrency is the whole reason the count is a single SQL statement: two
    // requests arriving together must not both read "3 so far" and both pass.
    await clearRateLimit(LIMIT, key);
    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        enforceRateLimit(LIMIT, key).then(
          () => "allowed" as const,
          () => "refused" as const,
        ),
      ),
    );
    const concurrentlyAllowed = results.filter((r) => r === "allowed").length;
    check(
      "ten simultaneous attempts still only let three through",
      concurrentlyAllowed === 3,
      `— ${concurrentlyAllowed} got through`,
    );

    await clearRateLimit(LIMIT, key);
    await enforceRateLimit(LIMIT, key);
    check("clearing the count lets a caller back in", true);

    // Separate keys must not share a budget — one noisy address must not lock
    // out the whole internet.
    await clearRateLimit(LIMIT, key);
    for (let i = 0; i < 3; i++) await enforceRateLimit(LIMIT, key);
    let otherKeyAllowed = true;
    try {
      await enforceRateLimit(LIMIT, `${key}:someone-else`);
    } catch {
      otherKeyAllowed = false;
    }
    check("a different caller has their own budget", otherKeyAllowed);
    await clearRateLimit(LIMIT, `${key}:someone-else`);
  } finally {
    await clearRateLimit(LIMIT, key);
  }

  const pruned = await pruneRateLimits(0);
  check("expired windows can be pruned", pruned >= 0);

  console.log(`\n${pass} passed, ${fail} failed\n`);
  await prisma.$disconnect();
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
