/**
 * Run with `npm run check:password-reset`. Needs the database up.
 *
 * Before this, a parent who forgot their password had no way back into the
 * account holding their child's medical records — and the screen told them a
 * reset email was on its way, having awaited a `setTimeout`.
 *
 * So this suite walks the whole thing the way a person does: ask for a link,
 * take the link out of the email that was actually sent, use it, and check that
 * the account it opens is the one it should be and that everything the old
 * password could reach is now shut. The parts worth being paranoid about get
 * their own assertions — the token is not stored in the clear, a link works
 * once, an expired one is refused, and a stranger cannot learn from this
 * endpoint whether an address belongs to a parent here.
 */
import "dotenv/config";
import { prisma } from "../../src/backend/database/client";
import { passwordResetService } from "../../src/backend/services/password-reset.service";
import { setMailer, type EmailMessage, type Mailer } from "../../src/backend/integrations/email";
import { authService, sessionStillHolds } from "../../src/backend/services/auth.service";
import { hashPassword, verifyPasswordHash } from "../../src/backend/utils/hash.util";
import { POST as forgotPassword } from "../../src/app/api/auth/forgot-password/route";
import { createHash } from "node:crypto";

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

async function refuses(label: string, run: () => Promise<unknown>) {
  try {
    await run();
    check(label, false, "— call was allowed");
  } catch (e) {
    const name = e instanceof Error ? e.name : "";
    check(label, name === "AppError" || name === "UnauthorizedError", `— threw ${name}`);
  }
}

/** Collects what would have been sent, so the test can read the real link. */
const outbox: EmailMessage[] = [];
const capturing: Mailer = {
  name: "capture",
  async send(message) {
    outbox.push(message);
  },
};

function linkIn(message: EmailMessage): string {
  const match = message.text.match(/https?:\/\/\S*reset-password\?token=\S+/);
  return match?.[0] ?? "";
}

function tokenIn(message: EmailMessage): string {
  return new URL(linkIn(message)).searchParams.get("token") ?? "";
}

const OLD_PASSWORD = "old-password-12345";
const NEW_PASSWORD = "new-password-67890";

async function main() {
  const previousMailer = setMailer(capturing);
  const stamp = Date.now().toString(36);
  const email = `reset-test-${stamp}@example.com`;

  const user = await prisma.user.create({
    data: {
      email,
      name: "Reset Test Parent",
      passwordHash: await hashPassword(OLD_PASSWORD),
      role: "PARENT",
    },
  });

  const disabled = await prisma.user.create({
    data: {
      email: `reset-disabled-${stamp}@example.com`,
      name: "Removed Parent",
      passwordHash: await hashPassword(OLD_PASSWORD),
      role: "PARENT",
      active: false,
    },
  });

  try {
    // --- Asking for a link ---------------------------------------------------
    console.log("\nAsking for a reset link");

    outbox.length = 0;
    await passwordResetService.request(email, "203.0.113.7");
    check("a link is sent to an account that exists", outbox.length === 1);

    const message = outbox[0];
    check("addressed to the account holder", message?.to === email);
    check("and it contains a link to this deployment", linkIn(message ?? { to: "", subject: "", text: "" }).length > 0);
    check("with a plain-text body, not only HTML", (message?.text.length ?? 0) > 0);

    const token = tokenIn(message);
    const stored = await prisma.passwordResetToken.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    check("a token row was written", stored !== null);
    check(
      "the token itself is never stored — only its hash",
      stored?.tokenHash === createHash("sha256").update(token).digest("hex") && stored?.tokenHash !== token,
    );
    check("the request address is kept for the trail", stored?.requestIp === "203.0.113.7");
    check(
      "and it expires within the half hour it promises",
      (stored?.expiresAt.getTime() ?? 0) - Date.now() <= 30 * 60_000 + 5_000,
    );

    // --- What the endpoint tells a stranger ----------------------------------
    console.log("\nWhat the endpoint is willing to tell a stranger");

    outbox.length = 0;
    const unknown = await forgotPassword(
      request(`nobody-${stamp}@example.com`, "198.51.100.4"),
    );
    const known = await forgotPassword(request(email, "198.51.100.5"));
    check("an unknown address is accepted", unknown.status === 202);
    check("exactly as a real one is", known.status === 202);
    check(
      "and the two answers are word for word identical",
      JSON.stringify(await unknown.json()) === JSON.stringify(await known.json()),
    );
    check("nothing was sent to the unknown address", outbox.every((m) => m.to !== `nobody-${stamp}@example.com`));

    outbox.length = 0;
    await passwordResetService.request(disabled.email, "198.51.100.6");
    check("a disabled account is not a way back in", outbox.length === 0);

    // The second request above (`known`) is the current live token; the first
    // one must be dead, or two links in a mailbox both open the account.
    console.log("\nOnly the newest link works");
    check("the first link is no longer valid", (await passwordResetService.check(token)) === false);
    check(
      "and exactly one token is left live for the account",
      (await prisma.passwordResetToken.count({ where: { userId: user.id, usedAt: null } })) === 1,
    );

    // --- Using the link ------------------------------------------------------
    console.log("\nUsing the link");

    outbox.length = 0;
    await passwordResetService.request(email, "203.0.113.9");
    const liveToken = tokenIn(outbox[0]);
    check("a fresh link checks out", (await passwordResetService.check(liveToken)) === true);
    check("a made-up token does not", (await passwordResetService.check("not-a-real-token")) === false);
    check("nor does an empty one", (await passwordResetService.check("")) === false);

    // A session issued before the reset, to prove it stops working after.
    const before = await authService.login({ email, password: OLD_PASSWORD });
    check("precondition: the old password still signs in", before.user.email === email);
    // Backdated by a few seconds on purpose. Revocation refuses tokens issued
    // *before* the revoking instant, and both sides are compared in whole
    // seconds so that a token signed in the same second as a revocation still
    // passes — that grace is what lets someone sign straight back in after
    // "sign out everywhere". A real session predates its own reset by rather
    // more than a second.
    const oldClaims = { ...claimsOf(before.user), iat: Math.floor(Date.now() / 1000) - 60 };
    check("precondition: that session is good", (await sessionStillHolds(oldClaims)) === true);

    await passwordResetService.complete(liveToken, NEW_PASSWORD);

    const after = await prisma.user.findUnique({ where: { id: user.id } });
    check("the new password is set", await verifyPasswordHash(NEW_PASSWORD, after!.passwordHash));
    check("the old one no longer works", !(await verifyPasswordHash(OLD_PASSWORD, after!.passwordHash)));
    await refuses("and signing in with it is refused", () =>
      authService.login({ email, password: OLD_PASSWORD }),
    );
    const signedIn = await authService.login({ email, password: NEW_PASSWORD });
    check("while the new one signs in", signedIn.user.id === user.id);

    // The point of the whole exercise: whoever else was holding this account is
    // now holding nothing.
    check(
      "every session that existed before the reset is refused",
      (await sessionStillHolds(oldClaims)) === false,
    );

    await refuses("the link cannot be used twice", () =>
      passwordResetService.complete(liveToken, "another-password-1"),
    );

    // --- Expiry --------------------------------------------------------------
    console.log("\nA link that sat in a mailbox too long");

    outbox.length = 0;
    await passwordResetService.request(email, "203.0.113.11");
    const staleToken = tokenIn(outbox[0]);
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    check("an expired link does not check out", (await passwordResetService.check(staleToken)) === false);
    await refuses("and cannot be used", () => passwordResetService.complete(staleToken, "yet-another-1"));
    const untouched = await prisma.user.findUnique({ where: { id: user.id } });
    check(
      "the password is exactly as it was",
      await verifyPasswordHash(NEW_PASSWORD, untouched!.passwordHash),
    );
  } finally {
    setMailer(previousMailer);
    await prisma.user.deleteMany({ where: { id: { in: [user.id, disabled.id] } } });
    await prisma.rateLimit.deleteMany({
      where: { bucket: { in: ["reset-request-ip", "reset-request-email"] } },
    });
  }

  console.log(`\n${pass} passed, ${fail} failed\n`);
  await prisma.$disconnect();
  process.exit(fail === 0 ? 0 : 1);
}

function request(email: string, ip: string) {
  return new Request("http://localhost/api/auth/forgot-password", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify({ email }),
  }) as never;
}

function claimsOf(user: { id: string; role: string; email: string; name: string; branchId: string | null }) {
  return {
    sub: user.id,
    role: user.role as "PARENT",
    email: user.email,
    name: user.name,
    branchId: user.branchId,
  };
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
