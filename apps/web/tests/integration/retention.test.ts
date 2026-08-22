/**
 * Run with `npm run check:retention`. Needs the database up.
 *
 * Nothing in this product ever deleted anything: `pruneRateLimits()` was
 * written and never called, and the CCTV access log grew for ever. For a
 * system holding children's records that is not untidiness — keeping personal
 * data past its purpose is the problem itself.
 *
 * So this suite is about what goes and, more importantly, what stays. A
 * retention job that deletes slightly too much is a data-loss incident, and the
 * assertions below are weighted accordingly: every prune is checked against a
 * row that is one day *inside* its period, and against the one category that
 * must survive any age at all — an unread notification.
 */
import "dotenv/config";
import { prisma } from "../../src/backend/database/client";
import { retentionService } from "../../src/backend/services/retention.service";
import { hashPassword } from "../../src/backend/utils/hash.util";
import { env } from "../../src/config/env";

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

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

async function main() {
  const stamp = Date.now().toString(36);
  const created: string[] = [];

  const user = await prisma.user.create({
    data: {
      email: `retention-${stamp}@example.com`,
      name: "Retention Test",
      passwordHash: await hashPassword("password12345"),
      role: "PARENT",
    },
  });
  created.push(user.id);

  const camera = await prisma.camera.findFirst();
  if (!camera) throw new Error("Seed the database first — need a camera.");

  try {
    // --- Set up one row either side of every line ---------------------------
    const oldToken = await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: `old-${stamp}`,
        expiresAt: daysAgo(30),
        createdAt: daysAgo(30),
      },
    });
    const freshToken = await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: `fresh-${stamp}`,
        expiresAt: new Date(Date.now() + 3_600_000),
        createdAt: new Date(),
      },
    });
    // Expired, but only just: still answers "was a reset requested?" during a
    // support conversation.
    const recentlyExpired = await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: `yesterday-${stamp}`,
        expiresAt: daysAgo(1),
        createdAt: daysAgo(1),
      },
    });

    const oldView = await prisma.cctvViewLog.create({
      data: {
        userId: user.id,
        cameraId: camera.id,
        action: "AUTHORIZE_GRANTED",
        createdAt: daysAgo(env.CCTV_LOG_RETENTION_DAYS + 5),
      },
    });
    const keptView = await prisma.cctvViewLog.create({
      data: {
        userId: user.id,
        cameraId: camera.id,
        action: "AUTHORIZE_DENIED",
        reason: "OUTSIDE_HOURS",
        createdAt: daysAgo(env.CCTV_LOG_RETENTION_DAYS - 1),
      },
    });

    const oldDelivery = await prisma.notificationDelivery.create({
      data: {
        userId: user.id,
        channel: "PUSH",
        status: "SENT",
        attemptedAt: daysAgo(env.DELIVERY_LOG_RETENTION_DAYS + 5),
      },
    });
    const keptDelivery = await prisma.notificationDelivery.create({
      data: {
        userId: user.id,
        channel: "PUSH",
        status: "FAILED",
        detail: "DeviceNotRegistered",
        attemptedAt: daysAgo(env.DELIVERY_LOG_RETENTION_DAYS - 1),
      },
    });

    const oldRead = await prisma.appNotification.create({
      data: {
        userId: user.id,
        kind: "ACTIVITY",
        title: `Old and read ${stamp}`,
        read: true,
        createdAt: daysAgo(env.NOTIFICATION_RETENTION_DAYS + 5),
      },
    });
    const oldUnread = await prisma.appNotification.create({
      data: {
        userId: user.id,
        kind: "EMERGENCY",
        title: `Old and unread ${stamp}`,
        read: false,
        createdAt: daysAgo(env.NOTIFICATION_RETENTION_DAYS + 5),
      },
    });
    const recentRead = await prisma.appNotification.create({
      data: {
        userId: user.id,
        kind: "NOTICE",
        title: `Recent and read ${stamp}`,
        read: true,
        createdAt: daysAgo(1),
      },
    });

    await prisma.rateLimit.create({
      data: {
        bucket: `retention-old-${stamp}`,
        key: "203.0.113.1",
        windowStart: daysAgo(3),
        count: 4,
      },
    });
    await prisma.rateLimit.create({
      data: {
        bucket: `retention-fresh-${stamp}`,
        key: "203.0.113.2",
        windowStart: new Date(),
        count: 1,
      },
    });

    // --- Run it -------------------------------------------------------------
    console.log("\nThe nightly prune");
    const result = await retentionService.run();
    check("it reports what it deleted", typeof result.cctvViewLogs === "number");
    check("including the rate-limit counters", result.rateLimits >= 1);

    const alive = async (table: "passwordResetToken" | "cctvViewLog" | "notificationDelivery" | "appNotification", id: string) => {
      const row = await (prisma[table] as { findUnique: (a: unknown) => Promise<unknown> }).findUnique({
        where: { id },
      });
      return row !== null;
    };

    console.log("\nWhat goes");
    check("a reset token that expired a month ago", !(await alive("passwordResetToken", oldToken.id)));
    check("a CCTV view log past its retention period", !(await alive("cctvViewLog", oldView.id)));
    check("a delivery record past its period", !(await alive("notificationDelivery", oldDelivery.id)));
    check("a read notification past its period", !(await alive("appNotification", oldRead.id)));
    check(
      "and a rate-limit window from three days ago",
      (await prisma.rateLimit.count({ where: { bucket: `retention-old-${stamp}` } })) === 0,
    );

    console.log("\nWhat stays — which is the half that matters");
    check("a live reset token", await alive("passwordResetToken", freshToken.id));
    check(
      "one that expired yesterday, while support is still talking to the parent",
      await alive("passwordResetToken", recentlyExpired.id),
    );
    check(
      "a CCTV log one day inside its period — including a denial",
      await alive("cctvViewLog", keptView.id),
    );
    check("a delivery failure one day inside its period", await alive("notificationDelivery", keptDelivery.id));
    check("a notification read yesterday", await alive("appNotification", recentRead.id));
    check(
      "and an unread emergency notification, whatever its age — deleting it would hide the failure",
      await alive("appNotification", oldUnread.id),
    );
    check(
      "a rate-limit window still counting",
      (await prisma.rateLimit.count({ where: { bucket: `retention-fresh-${stamp}` } })) === 1,
    );

    console.log("\nNothing about a child is touched");
    // The job deliberately deletes operational exhaust only. When a family
    // leaves, what may be deleted and what must be archived is a legal
    // question, and answering it in a cron job would be answering it by
    // accident.
    const studentsBefore = await prisma.student.count();
    const invoicesBefore = await prisma.invoice.count();
    const activitiesBefore = await prisma.activity.count();
    const mediaBefore = await prisma.mediaObject.count();
    await retentionService.run();
    check("children survive a second run", (await prisma.student.count()) === studentsBefore);
    check("so do invoices", (await prisma.invoice.count()) === invoicesBefore);
    check("so do feed posts", (await prisma.activity.count()) === activitiesBefore);
    check("so do photographs", (await prisma.mediaObject.count()) === mediaBefore);

    console.log("\nRunning it twice changes nothing the second time");
    const second = await retentionService.run();
    check("the second run finds no expired tokens", second.passwordResetTokens === 0);
    check("no old CCTV logs", second.cctvViewLogs === 0);
    check("and no old deliveries", second.notificationDeliveries === 0);
  } finally {
    await prisma.rateLimit.deleteMany({ where: { bucket: { contains: stamp } } });
    // CctvViewLog holds a non-cascading reference to the user on purpose: an
    // account cannot be deleted out from under the record of what it watched.
    // The test's own rows have to go first.
    await prisma.cctvViewLog.deleteMany({ where: { userId: { in: created } } });
    await prisma.user.deleteMany({ where: { id: { in: created } } });
  }

  console.log(`\n${pass} passed, ${fail} failed\n`);
  await prisma.$disconnect();
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
