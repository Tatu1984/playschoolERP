/**
 * Run with `npm run check:notifications`. Needs the seeded database up.
 *
 * The feature this covers used to be a lie. `POST /api/emergency/broadcasts`
 * wrote a row, the screen said the broadcast had gone out, and nothing left the
 * building — no push, no email, no record of either. For a school safety
 * feature that is the kind of thing that matters exactly once.
 *
 * So the suite is written from the head teacher's side after the fact: who did
 * this reach, who did it not reach, and does the record say why. It uses a
 * capturing push driver and mailer, because the assertions worth making are
 * about what was handed to the provider and what was written down afterwards —
 * not about whether Expo's servers were up.
 */
import "dotenv/config";
import { prisma } from "../../src/backend/database/client";
import { notificationService } from "../../src/backend/services/notification.service";
import { opsService } from "../../src/backend/services/ops.service";
import { setMailer, type EmailMessage, type Mailer } from "../../src/backend/integrations/email";
import {
  setPushSender,
  type PushMessage,
  type PushResult,
  type PushSender,
} from "../../src/backend/integrations/push";
import { hashPassword } from "../../src/backend/utils/hash.util";
import { ROLES, type Role } from "@/shared/constants/roles";
import type { Scope } from "../../src/backend/utils/scope.util";

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

// ---- Capturing drivers -----------------------------------------------------
const pushed: PushMessage[] = [];
/** Tokens the fake provider will call dead, to exercise the pruning path. */
const deadTokens = new Set<string>();
const capturingPush: PushSender = {
  name: "capture",
  async send(messages) {
    pushed.push(...messages);
    return messages.map<PushResult>((m) =>
      deadTokens.has(m.token)
        ? { token: m.token, ok: false, detail: "DeviceNotRegistered", retire: true }
        : { token: m.token, ok: true, detail: "", retire: false },
    );
  },
};

const outbox: EmailMessage[] = [];
/** Addresses the fake provider will refuse, to exercise the failure path. */
const bouncing = new Set<string>();
const capturingMail: Mailer = {
  name: "capture",
  async send(message) {
    if (bouncing.has(message.to)) throw new Error("mailbox unavailable");
    outbox.push(message);
  },
};

function scopeOf(over: Partial<Scope> & { role: Role }): Scope {
  return {
    userId: "",
    name: "Test Admin",
    branchId: null,
    staffId: null,
    studentIds: [],
    classroomIds: [],
    ...over,
  };
}

async function main() {
  const previousPush = setPushSender(capturingPush);
  const previousMail = setMailer(capturingMail);
  const stamp = Date.now().toString(36);
  const created: string[] = [];

  const branch = await prisma.branch.findFirst({ orderBy: { createdAt: "asc" } });
  const otherBranch = await prisma.branch.findFirst({
    where: { id: { not: branch?.id } },
    orderBy: { createdAt: "asc" },
  });
  if (!branch || !otherBranch) throw new Error("Seed the database first — need two branches.");

  /** A staff account at a branch, with whatever devices and preferences. */
  async function makeUser(opts: {
    suffix: string;
    branchId: string | null;
    tokens?: string[];
    channels?: Record<string, boolean>;
    mutedKinds?: string[];
    quietHours?: { from: string; to: string } | null;
  }) {
    const user = await prisma.user.create({
      data: {
        email: `notify-${opts.suffix}-${stamp}@example.com`,
        name: `Notify ${opts.suffix}`,
        passwordHash: await hashPassword("password12345"),
        role: "TEACHER",
        branchId: opts.branchId,
      },
    });
    created.push(user.id);
    for (const token of opts.tokens ?? []) {
      await prisma.deviceToken.create({
        data: { userId: user.id, token, platform: "ANDROID", label: "Test handset" },
      });
    }
    if (opts.channels || opts.mutedKinds || opts.quietHours !== undefined) {
      await prisma.notificationPreference.create({
        data: {
          userId: user.id,
          channels: opts.channels ?? {},
          mutedKinds: opts.mutedKinds ?? [],
          quietHours: opts.quietHours ?? undefined,
        },
      });
    }
    return user;
  }

  const reachable = await makeUser({
    suffix: "reachable",
    branchId: branch.id,
    tokens: [`ExponentPushToken[live-${stamp}]`],
  });
  const deadDevice = await makeUser({
    suffix: "dead-device",
    branchId: branch.id,
    tokens: [`ExponentPushToken[dead-${stamp}]`],
  });
  deadTokens.add(`ExponentPushToken[dead-${stamp}]`);

  const noDevice = await makeUser({ suffix: "no-device", branchId: branch.id });
  const pushOff = await makeUser({
    suffix: "push-off",
    branchId: branch.id,
    tokens: [`ExponentPushToken[pushoff-${stamp}]`],
    channels: { PUSH: false, EMAIL: true, IN_APP: true },
  });
  const allOff = await makeUser({
    suffix: "all-off",
    branchId: branch.id,
    channels: { PUSH: false, EMAIL: false, IN_APP: true },
  });
  const bouncer = await makeUser({ suffix: "bounces", branchId: branch.id });
  bouncing.add(bouncer.email);
  const elsewhere = await makeUser({ suffix: "other-branch", branchId: otherBranch.id });
  // Registered with a raw FCM token rather than an Expo one. Nothing reads this
  // variable — the assertion is that its token never reaches the provider.
  await makeUser({
    suffix: "raw-fcm",
    branchId: branch.id,
    tokens: [`fcm-raw-token-${stamp}`],
  });
  // Somebody who has switched SMS on in their preferences. It is off by
  // default, which means the ordinary skip reason is "the recipient turned this
  // channel off" — the interesting case is the one who asked for it and cannot
  // have it, because this codebase has no SMS provider.
  const wantsSms = await makeUser({
    suffix: "wants-sms",
    branchId: branch.id,
    channels: { PUSH: true, EMAIL: true, SMS: true, IN_APP: true },
  });

  const admin = scopeOf({ role: ROLES.ADMIN, branchId: branch.id, userId: reachable.id });

  try {
    // --- Sending it ---------------------------------------------------------
    console.log("\nAn emergency broadcast reaches people, not a table");

    pushed.length = 0;
    outbox.length = 0;

    const broadcast = await opsService.broadcast(admin, {
      title: `Lockdown drill ${stamp}`,
      body: "The gates are closed until further notice. Please do not come to collect.",
      severity: "CRITICAL",
    });

    const inApp = await prisma.appNotification.findMany({
      where: { title: `Lockdown drill ${stamp}` },
    });
    const recipientIds = new Set(inApp.map((n) => n.userId));
    check("everyone at the branch has it in the portal", inApp.length >= 8);
    check("including a parent with a device", recipientIds.has(reachable.id));
    check("and one with none", recipientIds.has(noDevice.id));
    check("nobody at the other branch does", !recipientIds.has(elsewhere.id));
    check(
      "the in-app row carries the emergency emoji rather than a generic bell",
      inApp[0]?.emoji === "🚨",
    );
    check(
      "the broadcast records how many people it is for",
      broadcast.delivery.recipients === inApp.length,
      `— ${broadcast.delivery.recipients} vs ${inApp.length}`,
    );
    check(
      "and says delivery has not finished yet, rather than claiming it has",
      broadcast.delivery.finishedAt === null,
    );

    // --- Delivering it ------------------------------------------------------
    console.log("\nWhat actually left the building");

    const summary = await notificationService.deliverBroadcast(broadcast.id);
    check("delivery reports the same recipient count", summary.recipients === inApp.length);
    check("and reached at least the people who can be reached", summary.delivered > 0);

    const tokensPushed = new Set(pushed.map((m) => m.token));
    check("a live device was pushed to", tokensPushed.has(`ExponentPushToken[live-${stamp}]`));
    check(
      "a device belonging to someone who turned push off was not",
      !tokensPushed.has(`ExponentPushToken[pushoff-${stamp}]`),
    );
    check(
      "a token this provider cannot use was not sent to it",
      !tokensPushed.has(`fcm-raw-token-${stamp}`),
    );
    check("the push was marked urgent", pushed.every((m) => m.urgent === true));
    check("and carries somewhere to land", pushed.every((m) => m.data?.href === "/parent/safety"));

    const mailed = new Set(outbox.map((m) => m.to));
    check("email went to someone with no device at all", mailed.has(noDevice.email));
    check("and to the person who kept email on but push off", mailed.has(pushOff.email));
    check("and not to the person who turned everything off", !mailed.has(allOff.email));
    check(
      "an urgent broadcast says so in the subject line",
      outbox.every((m) => m.subject.startsWith("URGENT:")),
    );

    // --- The record ---------------------------------------------------------
    console.log("\nThe record of who was not reached");

    const deliveries = await prisma.notificationDelivery.findMany({
      where: { broadcastId: broadcast.id },
    });
    const rowsFor = (userId: string) => deliveries.filter((d) => d.userId === userId);

    check("there is a record per recipient per channel", deliveries.length > inApp.length);
    check(
      "the in-app row is recorded as sent for everybody",
      deliveries.filter((d) => d.channel === "IN_APP" && d.status === "SENT").length === inApp.length,
    );
    check(
      "a switched-off channel is recorded with the recipient's own reason",
      rowsFor(pushOff.id).some(
        (d) => d.channel === "PUSH" && d.status === "SKIPPED" && d.detail.includes("turned this channel off"),
      ),
    );
    check(
      "having no device is recorded, not silently ignored",
      rowsFor(noDevice.id).some((d) => d.channel === "PUSH" && d.detail === "no registered device"),
    );
    check(
      "a recipient who asked for SMS is told there is no SMS provider",
      rowsFor(wantsSms.id).some(
        (d) => d.channel === "SMS" && d.status === "SKIPPED" && d.detail.includes("no SMS provider"),
      ),
    );
    check(
      "while everyone else's SMS row simply says they never wanted it",
      rowsFor(noDevice.id).some(
        (d) => d.channel === "SMS" && d.detail.includes("turned this channel off"),
      ),
    );
    check(
      "a bounced email is recorded as failed, with what the provider said",
      rowsFor(bouncer.id).some(
        (d) => d.channel === "EMAIL" && d.status === "FAILED" && d.detail.includes("mailbox unavailable"),
      ),
    );
    check(
      "a dead handset is recorded as failed",
      rowsFor(deadDevice.id).some((d) => d.channel === "PUSH" && d.status === "FAILED"),
    );
    check(
      "somebody unreachable by every outbound channel is counted as unreached",
      summary.failed >= 1,
    );

    const afterDelivery = await prisma.safetyBroadcast.findUnique({ where: { id: broadcast.id } });
    check("the broadcast now knows delivery finished", afterDelivery?.deliveryFinishedAt !== null);
    check(
      "and carries the counts the screen needs to stop saying 'sent'",
      afterDelivery?.deliveredCount === summary.delivered &&
        afterDelivery?.failedCount === summary.failed,
    );

    // --- Dead tokens --------------------------------------------------------
    console.log("\nA handset the provider says is gone");
    const remaining = await prisma.deviceToken.findMany({ where: { userId: deadDevice.id } });
    check("the dead token is deleted, not left to fail for ever", remaining.length === 0);
    const stillThere = await prisma.deviceToken.findMany({ where: { userId: reachable.id } });
    check("a working one is left alone", stillThere.length === 1);

    // --- Quiet hours --------------------------------------------------------
    console.log("\nQuiet hours, and the message that ignores them");

    const sleeper = await makeUser({
      suffix: "asleep",
      branchId: branch.id,
      tokens: [`ExponentPushToken[asleep-${stamp}]`],
      // The whole day, so the test does not depend on when it runs.
      quietHours: { from: "00:00", to: "23:59" },
    });

    pushed.length = 0;
    await notificationService.notify({
      userId: sleeper.id,
      kind: "ACTIVITY",
      title: "Painting today",
      body: "Wear old clothes tomorrow.",
    });
    check(
      "an ordinary notification waits until morning",
      !pushed.some((m) => m.token === `ExponentPushToken[asleep-${stamp}]`),
    );
    const quietRows = await prisma.notificationDelivery.findMany({
      where: { userId: sleeper.id, channel: "PUSH" },
    });
    check(
      "and the record says why",
      quietRows.some((d) => d.detail.includes("quiet hours")),
    );
    check(
      "but it is still in the portal in the morning",
      (await prisma.appNotification.count({ where: { userId: sleeper.id } })) === 1,
    );

    pushed.length = 0;
    await notificationService.notify({
      userId: sleeper.id,
      kind: "EMERGENCY",
      title: "Gates closed",
      body: "Please do not come to collect yet.",
      urgent: true,
    });
    check(
      "an emergency does not",
      pushed.some((m) => m.token === `ExponentPushToken[asleep-${stamp}]`),
    );
  } finally {
    setPushSender(previousPush);
    setMailer(previousMail);
    await prisma.safetyBroadcast.deleteMany({ where: { title: { contains: stamp } } });
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
