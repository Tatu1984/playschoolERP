/**
 * Deleting what there is no longer a reason to keep.
 *
 * Nothing in this product ever deleted anything. `pruneRateLimits()` was
 * written and never called; `CctvViewLog` grows for ever; every notification
 * delivery attempt is kept indefinitely. For a system holding children's
 * records that is not merely untidy — under the DPDP Act, keeping personal data
 * after its purpose is finished is itself the problem, and "we never got round
 * to deleting it" is not a defence anybody wants to make.
 *
 * What this deletes is deliberately narrow: operational exhaust, on periods
 * chosen for a reason each. What it does **not** touch is anything about a
 * child — records, medical notes, invoices, photographs, messages. Deleting
 * those when a family leaves is a real policy question with legal weight (how
 * long must a school keep an admission record? what must be archived rather
 * than deleted?), and answering it in a cron job would be answering it by
 * accident. See docs/ops/retention.md for what still needs deciding.
 *
 * Every period is configurable, because "how long do you keep the CCTV access
 * log" is a question a school's lawyer answers, not this file.
 */
import { prisma } from "@/backend/database/client";
import { pruneRateLimits } from "@/backend/utils/rate-limit.util";
import { logger } from "@/backend/utils/logger.util";
import { env } from "@/config/env";

export interface RetentionResult {
  rateLimits: number;
  passwordResetTokens: number;
  cctvViewLogs: number;
  notificationDeliveries: number;
  readNotifications: number;
}

const DAY_MS = 86_400_000;

function cutoff(days: number): Date {
  return new Date(Date.now() - days * DAY_MS);
}

export const retentionService = {
  /**
   * Run every prune. Safe to run repeatedly and safe to run concurrently: each
   * one is a delete of rows that are already past their period, so a second run
   * simply finds nothing.
   */
  async run(): Promise<RetentionResult> {
    const startedAt = Date.now();

    // Counters for who tried to sign in too often. Nothing reads an expired
    // window — the upsert overwrites it — so this is purely about not keeping a
    // row per address for ever.
    const rateLimits = await pruneRateLimits(24 * 3600);

    // A spent or expired reset token is a dead credential. Kept a week beyond
    // expiry so that "was a reset requested for this account?" can still be
    // answered while a support conversation is live, then gone.
    const { count: passwordResetTokens } = await prisma.passwordResetToken.deleteMany({
      where: { expiresAt: { lt: cutoff(7) } },
    });

    // Who watched which camera, and when. This is the record that answers "did
    // a member of staff sit watching one child" — so it is kept far longer than
    // the footage itself, and its period is a deliberate decision rather than
    // an accident of nobody deleting anything.
    const { count: cctvViewLogs } = await prisma.cctvViewLog.deleteMany({
      where: { createdAt: { lt: cutoff(env.CCTV_LOG_RETENTION_DAYS) } },
    });

    // Delivery attempts: useful for weeks after a broadcast ("who did not get
    // it"), useless after months, and one row per recipient per channel.
    const { count: notificationDeliveries } = await prisma.notificationDelivery.deleteMany({
      where: { attemptedAt: { lt: cutoff(env.DELIVERY_LOG_RETENTION_DAYS) } },
    });

    // Notifications a parent has already read. Unread ones stay whatever their
    // age: an unread emergency broadcast from four months ago is a thing
    // somebody should still see, and deleting it would hide the failure.
    const { count: readNotifications } = await prisma.appNotification.deleteMany({
      where: { read: true, createdAt: { lt: cutoff(env.NOTIFICATION_RETENTION_DAYS) } },
    });

    const result = {
      rateLimits,
      passwordResetTokens,
      cctvViewLogs,
      notificationDeliveries,
      readNotifications,
    };

    // Logged under a different name for the reset tokens: the logger redacts
    // any field whose name contains "token", and a redacted *count* reads like
    // a leak that was narrowly avoided rather than like the number four.
    logger.info("Retention run complete", {
      rateLimits: result.rateLimits,
      expiredResets: result.passwordResetTokens,
      cctvViewLogs: result.cctvViewLogs,
      notificationDeliveries: result.notificationDeliveries,
      readNotifications: result.readNotifications,
      tookMs: Date.now() - startedAt,
    });
    return result;
  },
};
