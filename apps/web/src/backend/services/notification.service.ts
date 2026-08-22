/**
 * Getting a notification out of the database and onto a phone.
 *
 * `AppNotification`, `DeviceToken`, `NotificationPreference` and
 * `SafetyBroadcast` have always persisted correctly, and nothing sent
 * anything. The sharpest case is an emergency broadcast: a head teacher hit
 * "send", a row was written, and it reached nobody — while the screen said it
 * had gone out. For a school safety feature that distinction matters exactly
 * once, and by then it is the only thing that matters.
 *
 * What this does, in order:
 *
 *  1. Writes the in-app row, which is what the portal's bell menu reads. This
 *     is the durable part and happens inline, so it survives even if every
 *     provider is down.
 *  2. Asks each recipient's preferences which channels may be used, in their
 *     school's timezone. See notification-policy.util.ts — the rules are pure
 *     and tested on their own.
 *  3. Sends push and email, and records one row per recipient per channel with
 *     the outcome, including exactly why a channel was skipped.
 *  4. Deletes device tokens the provider says are dead, so the next broadcast
 *     does not report failures that mean nothing.
 *
 * Nothing here throws on a delivery failure. A fan-out that stops at the first
 * unreachable handset is worse than one that finishes and reports.
 */
import { prisma } from "@/backend/database/client";
import { mailer } from "@/backend/integrations/email";
import { isExpoToken, pushSender, type PushMessage } from "@/backend/integrations/push";
import { logger } from "@/backend/utils/logger.util";
import {
  decideChannel,
  localMinutesIn,
  type RecipientPreferences,
} from "@/backend/utils/notification-policy.util";
import type { NotificationChannel } from "@/shared/types/ops.types";
import { env } from "@/config/env";

type Kind =
  | "ACTIVITY"
  | "ATTENDANCE"
  | "NOTICE"
  | "FEE"
  | "MESSAGE"
  | "EVENT"
  | "ACHIEVEMENT"
  | "EMERGENCY"
  | "SYSTEM";

type Status = "SENT" | "SKIPPED" | "FAILED";

interface DeliveryRow {
  userId: string;
  channel: NotificationChannel;
  status: Status;
  detail: string;
  broadcastId?: string | null;
  attemptedAt: Date;
}

export interface DeliverySummary {
  recipients: number;
  /** Recipients whose phone or inbox was actually reached. */
  delivered: number;
  /** Recipients reached in the portal only — nothing left the building. */
  failed: number;
}

const SEVERITY_EMOJI: Record<string, string> = {
  INFO: "ℹ️",
  WARNING: "⚠️",
  CRITICAL: "🚨",
};

/** Channels a message can leave by. IN_APP is written separately, first. */
const OUTBOUND: NotificationChannel[] = ["PUSH", "EMAIL", "SMS", "WHATSAPP"];

/**
 * Channels with no provider in this codebase. They are reported as skipped with
 * a reason rather than silently omitted: a school that has switched SMS on in
 * settings should be able to see that nothing was sent by it.
 */
const UNIMPLEMENTED: Partial<Record<NotificationChannel, string>> = {
  SMS: "no SMS provider is configured",
  WHATSAPP: "no WhatsApp provider is configured",
};

const DEFAULT_CHANNELS: Record<NotificationChannel, boolean> = {
  PUSH: true,
  EMAIL: true,
  SMS: false,
  WHATSAPP: false,
  IN_APP: true,
};

export const notificationService = {
  /**
   * Who a broadcast is for.
   *
   * Staff are found by the branch on their account. Parents are not: a parent's
   * branch is wherever their children are, so they are found through
   * guardianship — the same rule `resolveScope` uses, for the same reason. A
   * broadcast with no branch is school-wide and goes to everyone.
   */
  async recipientsForBroadcast(branchId: string | null): Promise<string[]> {
    if (!branchId) {
      const rows = await prisma.user.findMany({ where: { active: true }, select: { id: true } });
      return rows.map((r) => r.id);
    }

    const [staff, parents] = await Promise.all([
      prisma.user.findMany({ where: { active: true, branchId }, select: { id: true } }),
      prisma.user.findMany({
        where: {
          active: true,
          guardian: { is: { guardianships: { some: { student: { branchId } } } } },
        },
        select: { id: true },
      }),
    ]);

    return [...new Set([...staff.map((s) => s.id), ...parents.map((p) => p.id)])];
  },

  /**
   * The durable half: the rows the portal reads, written before anything is
   * attempted over a network. Returns how many people it is for.
   */
  async recordBroadcastInApp(broadcast: {
    id: string;
    title: string;
    body: string;
    severity: string;
    branchId: string | null;
  }): Promise<number> {
    const recipients = await this.recipientsForBroadcast(broadcast.branchId);
    if (recipients.length === 0) {
      logger.warn("Safety broadcast has no recipients", { broadcastId: broadcast.id });
    }

    const now = new Date();
    await prisma.$transaction([
      prisma.appNotification.createMany({
        data: recipients.map((userId) => ({
          userId,
          kind: "EMERGENCY" as Kind,
          title: broadcast.title,
          body: broadcast.body,
          href: "/parent/safety",
          emoji: SEVERITY_EMOJI[broadcast.severity] ?? "🔔",
        })),
      }),
      prisma.notificationDelivery.createMany({
        data: recipients.map((userId) => ({
          userId,
          channel: "IN_APP" as NotificationChannel,
          status: "SENT" as Status,
          broadcastId: broadcast.id,
          attemptedAt: now,
        })),
      }),
      prisma.safetyBroadcast.update({
        where: { id: broadcast.id },
        data: { recipientCount: recipients.length },
      }),
    ]);

    return recipients.length;
  },

  /**
   * The outbound half: push and email to everyone the broadcast is for.
   *
   * Called after the response has gone back to the admin who sent it, so the
   * "send" button does not wait on four hundred handsets. Safe to run twice —
   * it appends delivery rows rather than reconciling them, and a parent
   * receiving an emergency twice is not the failure worth designing against.
   */
  async deliverBroadcast(broadcastId: string): Promise<DeliverySummary> {
    const broadcast = await prisma.safetyBroadcast.findUnique({ where: { id: broadcastId } });
    if (!broadcast) {
      logger.error("Asked to deliver a broadcast that does not exist", undefined, { broadcastId });
      return { recipients: 0, delivered: 0, failed: 0 };
    }

    const recipientIds = await this.recipientsForBroadcast(broadcast.branchId);
    const summary = await this.fanOut({
      recipientIds,
      broadcastId,
      kind: "EMERGENCY",
      title: broadcast.title,
      body: broadcast.body,
      href: "/parent/safety",
      urgent: broadcast.severity === "CRITICAL",
      timeZone: await branchTimeZone(broadcast.branchId),
    });

    await prisma.safetyBroadcast.update({
      where: { id: broadcastId },
      data: {
        recipientCount: summary.recipients,
        deliveredCount: summary.delivered,
        failedCount: summary.failed,
        deliveryFinishedAt: new Date(),
      },
    });

    const level = summary.failed > 0 ? "warn" : "info";
    logger[level]("Safety broadcast delivered", {
      broadcastId,
      severity: broadcast.severity,
      recipients: summary.recipients,
      delivered: summary.delivered,
      unreached: summary.failed,
      push: pushSender.name,
      email: mailer.name,
    });

    return summary;
  },

  /**
   * One notification to one person, in-app row included. The general entry
   * point for everything that is not a broadcast — a fee reminder, a message,
   * an attendance mark — none of which call it yet.
   */
  async notify(input: {
    userId: string;
    kind: Kind;
    title: string;
    body?: string;
    href?: string;
    emoji?: string;
    urgent?: boolean;
    timeZone?: string;
  }): Promise<DeliverySummary> {
    await prisma.appNotification.create({
      data: {
        userId: input.userId,
        kind: input.kind,
        title: input.title,
        body: input.body ?? "",
        href: input.href,
        emoji: input.emoji ?? "🔔",
      },
    });

    return this.fanOut({
      recipientIds: [input.userId],
      kind: input.kind,
      title: input.title,
      body: input.body ?? "",
      href: input.href,
      urgent: input.urgent ?? false,
      timeZone: input.timeZone ?? "Asia/Kolkata",
    });
  },

  /**
   * Push and email for a set of recipients, and the record of what happened.
   *
   * One query for the people, one for their preferences, one for their devices:
   * a fan-out to a whole branch must not be one query per parent.
   */
  async fanOut(input: {
    recipientIds: string[];
    kind: Kind;
    title: string;
    body: string;
    href?: string;
    urgent: boolean;
    timeZone: string;
    broadcastId?: string;
  }): Promise<DeliverySummary> {
    const { recipientIds } = input;
    if (recipientIds.length === 0) return { recipients: 0, delivered: 0, failed: 0 };

    const [users, preferences, devices] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: recipientIds } },
        select: { id: true, email: true, name: true },
      }),
      prisma.notificationPreference.findMany({ where: { userId: { in: recipientIds } } }),
      prisma.deviceToken.findMany({
        where: { userId: { in: recipientIds }, token: { not: null } },
        select: { id: true, userId: true, token: true },
      }),
    ]);

    const prefsByUser = new Map(preferences.map((p) => [p.userId, readPreferences(p)]));
    const devicesByUser = new Map<string, { id: string; token: string }[]>();
    for (const device of devices) {
      if (!device.token) continue;
      const list = devicesByUser.get(device.userId) ?? [];
      list.push({ id: device.id, token: device.token });
      devicesByUser.set(device.userId, list);
    }

    const now = new Date();
    const localMinutes = localMinutesIn(input.timeZone, now);
    const rows: DeliveryRow[] = [];
    const pushQueue: { userId: string; deviceId: string; message: PushMessage }[] = [];
    const emailQueue: { userId: string; to: string; name: string }[] = [];

    for (const user of users) {
      const prefs = prefsByUser.get(user.id) ?? defaultPreferences();

      for (const channel of OUTBOUND) {
        const decision = decideChannel({
          channel,
          kind: input.kind,
          prefs,
          urgent: input.urgent,
          localMinutes,
        });

        if (!decision.send) {
          rows.push(skipped(user.id, channel, decision.reason, input.broadcastId, now));
          continue;
        }

        const unimplemented = UNIMPLEMENTED[channel];
        if (unimplemented) {
          rows.push(skipped(user.id, channel, unimplemented, input.broadcastId, now));
          continue;
        }

        if (channel === "PUSH") {
          const userDevices = devicesByUser.get(user.id) ?? [];
          const usable = userDevices.filter((d) => isExpoToken(d.token));
          if (userDevices.length === 0) {
            rows.push(skipped(user.id, channel, "no registered device", input.broadcastId, now));
            continue;
          }
          if (usable.length === 0) {
            rows.push(
              skipped(user.id, channel, "no token this provider can use", input.broadcastId, now),
            );
            continue;
          }
          for (const device of usable) {
            pushQueue.push({
              userId: user.id,
              deviceId: device.id,
              message: {
                token: device.token,
                title: input.title,
                body: input.body,
                data: input.href ? { href: input.href } : undefined,
                urgent: input.urgent,
              },
            });
          }
          continue;
        }

        if (channel === "EMAIL") {
          if (!user.email) {
            rows.push(skipped(user.id, channel, "no email address", input.broadcastId, now));
            continue;
          }
          emailQueue.push({ userId: user.id, to: user.email, name: user.name });
        }
      }
    }

    // ---- Push, in one batched call, then retire what came back dead --------
    if (pushQueue.length > 0) {
      const results = await pushSender.send(pushQueue.map((p) => p.message));
      const retire: string[] = [];
      results.forEach((result, index) => {
        const queued = pushQueue[index];
        if (!queued) return;
        rows.push({
          userId: queued.userId,
          channel: "PUSH",
          status: result.ok ? "SENT" : "FAILED",
          detail: result.detail,
          broadcastId: input.broadcastId ?? null,
          attemptedAt: now,
        });
        if (result.retire) retire.push(queued.deviceId);
      });

      if (retire.length > 0) {
        await prisma.deviceToken.deleteMany({ where: { id: { in: retire } } });
        logger.info("Retired device tokens the push provider rejected", { count: retire.length });
      }
    }

    // ---- Email, a few at a time -------------------------------------------
    const link = input.href ? `${env.APP_URL.replace(/\/$/, "")}${input.href}` : env.APP_URL;
    for (const chunk of chunks(emailQueue, 5)) {
      const settled = await Promise.all(
        chunk.map(async (item) => {
          try {
            await mailer.send({
              to: item.to,
              subject: input.urgent ? `URGENT: ${input.title}` : input.title,
              text: `${item.name},\n\n${input.title}\n\n${input.body}\n\n${link}\n\nClimb Kiddo`,
            });
            return { userId: item.userId, ok: true, detail: "" };
          } catch (e) {
            return {
              userId: item.userId,
              ok: false,
              detail: (e instanceof Error ? e.message : "email failed").slice(0, 200),
            };
          }
        }),
      );
      for (const result of settled) {
        rows.push({
          userId: result.userId,
          channel: "EMAIL",
          status: result.ok ? "SENT" : "FAILED",
          detail: result.detail,
          broadcastId: input.broadcastId ?? null,
          attemptedAt: now,
        });
      }
    }

    if (rows.length > 0) {
      await prisma.notificationDelivery.createMany({ data: rows });
    }

    // "Delivered" counts people, not messages: a parent with three handsets was
    // reached once. Anyone with no successful outbound channel has the
    // broadcast in the portal and nowhere else, which is what the school needs
    // to know in order to telephone them.
    const reached = new Set(rows.filter((r) => r.status === "SENT").map((r) => r.userId));
    return {
      recipients: recipientIds.length,
      delivered: reached.size,
      failed: recipientIds.length - reached.size,
    };
  },
};

function skipped(
  userId: string,
  channel: NotificationChannel,
  reason: string,
  broadcastId: string | undefined,
  at: Date,
): DeliveryRow {
  return {
    userId,
    channel,
    status: "SKIPPED",
    detail: reason,
    broadcastId: broadcastId ?? null,
    attemptedAt: at,
  };
}

function defaultPreferences(): RecipientPreferences {
  return { channels: { ...DEFAULT_CHANNELS }, mutedKinds: [], quietHours: null };
}

/** The preference row's JSON columns, defended against anything unexpected. */
function readPreferences(row: {
  channels: unknown;
  mutedKinds: string[];
  quietHours: unknown;
}): RecipientPreferences {
  const channels =
    row.channels && typeof row.channels === "object"
      ? { ...DEFAULT_CHANNELS, ...(row.channels as Record<string, boolean>) }
      : { ...DEFAULT_CHANNELS };

  const quiet = row.quietHours as { from?: unknown; to?: unknown } | null;
  const quietHours =
    quiet && typeof quiet.from === "string" && typeof quiet.to === "string"
      ? { from: quiet.from, to: quiet.to }
      : null;

  return { channels, mutedKinds: row.mutedKinds ?? [], quietHours };
}

/** The school's zone, for quiet hours. Falls back to the product's home zone. */
async function branchTimeZone(branchId: string | null): Promise<string> {
  if (!branchId) return "Asia/Kolkata";
  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    select: { timezone: true },
  });
  return branch?.timezone || "Asia/Kolkata";
}

function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
