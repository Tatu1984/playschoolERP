/**
 * Forgetting a password, and getting back in.
 *
 * Until now there was no way back: the form waited 700ms and claimed a mail was
 * on its way. A parent locked out of the account holding their child's medical
 * records had nothing but the office telephone, and was told otherwise.
 *
 * The shape is the ordinary one, and the details are where it is either safe or
 * theatre:
 *
 *  * The token is 32 random bytes. Only its SHA-256 is stored, so the table is
 *    not a list of live keys to accounts that have recently forgotten a
 *    password — which is the moment an account is least protected.
 *  * Single use and short lived. Mail sits in mailboxes and gets forwarded.
 *  * Requesting a reset says the same thing whether or not the account exists.
 *    The form already promises this; now it is true. Otherwise /forgot-password
 *    is an oracle for which parents are enrolled at the school.
 *  * Completing a reset revokes every session. A password change that leaves
 *    the old sessions alive is not a password change — the whole reason someone
 *    resets is that somebody else may be holding the account.
 *  * Any outstanding tokens are spent too. Two reset mails in a mailbox, one of
 *    them read by whoever prompted the reset, is the same problem again.
 */
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { prisma } from "@/backend/database/client";
import { authRepository } from "@/backend/repositories/auth.repository";
import { mailer } from "@/backend/integrations/email";
import { revokeSessions } from "@/backend/services/auth.service";
import { hashPassword } from "@/backend/utils/hash.util";
import { AppError } from "@/backend/utils/error-handler.util";
import { logger } from "@/backend/utils/logger.util";
import { env } from "@/config/env";

/**
 * Long enough that the whole mailbox is a better attack than the token, short
 * enough that a forwarded mail or a shared laptop stops mattering quickly.
 */
const TOKEN_TTL_MINUTES = 30;

export interface ResetRequestResult {
  /** Whether a mail actually went out. Never returned to the caller. */
  sent: boolean;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function resetUrl(token: string): string {
  return `${env.APP_URL.replace(/\/$/, "")}/reset-password?token=${token}`;
}

function body(name: string, link: string): { text: string; html: string } {
  const text = [
    `Hello ${name},`,
    "",
    "Someone asked to reset the password on your Climb Kiddo account.",
    "Open the link below to choose a new one. It works once and expires in",
    `${TOKEN_TTL_MINUTES} minutes.`,
    "",
    link,
    "",
    "If this was not you, you can ignore this email — your password has not",
    "changed. If it keeps happening, please tell the school office.",
    "",
    "Climb Kiddo",
  ].join("\n");

  const html = [
    `<p>Hello ${escapeHtml(name)},</p>`,
    "<p>Someone asked to reset the password on your Climb Kiddo account. Choose a new one with the button below — it works once and expires in " +
      `${TOKEN_TTL_MINUTES} minutes.</p>`,
    `<p><a href="${escapeHtml(link)}">Set a new password</a></p>`,
    `<p style="color:#666;font-size:13px">Or paste this into your browser:<br>${escapeHtml(link)}</p>`,
    "<p>If this was not you, you can ignore this email — your password has not changed. If it keeps happening, please tell the school office.</p>",
    "<p>Climb Kiddo</p>",
  ].join("");

  return { text, html };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const passwordResetService = {
  /**
   * Start a reset. Returns the same shape whether or not the address belongs to
   * anyone — the caller must not be able to tell, and neither must the timing
   * be so different that it tells for them.
   */
  async request(email: string, ip: string): Promise<ResetRequestResult> {
    const user = await authRepository.findByEmail(email);

    // A disabled account is not a way back in. Someone who was removed from the
    // school does not get to reset their way past that.
    if (!user || !user.active) {
      logger.info("Password reset requested for an address with no live account", { ip });
      return { sent: false };
    }

    const token = randomBytes(32).toString("base64url");
    const now = new Date();

    await prisma.$transaction([
      // Any reset already in flight is spent. Two live links in one mailbox is
      // the problem this feature is supposed to solve, not create.
      prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: now },
      }),
      prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(token),
          expiresAt: new Date(now.getTime() + TOKEN_TTL_MINUTES * 60_000),
          requestIp: ip,
          createdAt: now,
        },
      }),
    ]);

    const { text, html } = body(user.name, resetUrl(token));
    await mailer.send({
      to: user.email,
      subject: "Reset your Climb Kiddo password",
      text,
      html,
    });

    return { sent: true };
  },

  /**
   * Is this token worth showing a "choose a new password" form for?
   *
   * Only a courtesy — it saves a parent typing a new password twice into a form
   * backed by a link that expired yesterday. `complete` re-checks everything;
   * nothing here is a gate.
   */
  async check(token: string): Promise<boolean> {
    const row = await findLiveToken(token);
    return row !== null;
  },

  /** Set the new password, spend the token, and take back every session. */
  async complete(token: string, newPassword: string): Promise<void> {
    const row = await findLiveToken(token);
    if (!row) {
      throw new AppError(
        "This reset link has expired or has already been used — please request a new one",
        400,
        "reset_token_invalid",
      );
    }

    const passwordHash = await hashPassword(newPassword);
    const now = new Date();

    await prisma.$transaction([
      prisma.user.update({ where: { id: row.userId }, data: { passwordHash } }),
      prisma.passwordResetToken.update({ where: { id: row.id }, data: { usedAt: now } }),
      // Anything else outstanding for this account dies with it.
      prisma.passwordResetToken.updateMany({
        where: { userId: row.userId, usedAt: null },
        data: { usedAt: now },
      }),
    ]);

    // After the password is committed, not before: a revocation followed by a
    // failed write would sign everyone out and change nothing.
    await revokeSessions(row.userId);
    logger.info("Password reset completed", { userId: row.userId });
  },
};

/**
 * The token row, if it is real, unspent and unexpired.
 *
 * Looked up by hash — the lookup is an indexed equality on a value the caller
 * cannot produce without the token, so there is nothing to compare in variable
 * time. The explicit constant-time compare below is belt and braces for the
 * day someone changes this to a scan.
 */
async function findLiveToken(token: string) {
  if (!token) return null;
  const tokenHash = hashToken(token);
  const row = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!row) return null;

  const a = Buffer.from(row.tokenHash, "utf8");
  const b = Buffer.from(tokenHash, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  if (row.usedAt) return null;
  if (row.expiresAt.getTime() <= Date.now()) return null;
  return row;
}
