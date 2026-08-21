/**
 * How often one caller may do one thing.
 *
 * The counter lives in Postgres, not in this process. On Vercel each request
 * may be served by a different instance with its own memory, so an in-process
 * counter would reset on every cold start and only ever see the fraction of
 * traffic that happened to land on the same instance — which is indistinguishable
 * from no limit at all. One shared table is slower and actually works.
 *
 * The window is fixed rather than sliding: a caller gets `max` attempts per
 * window, and the count resets when the window rolls over. That allows a burst
 * of up to 2×max across a window boundary, which is a real weakness of fixed
 * windows and an entirely acceptable one here — the job is to stop someone
 * working through a password list, not to meter an API to the request.
 */
import { prisma } from "@/backend/database/client";
import { AppError } from "./error-handler.util";

export class RateLimitedError extends AppError {
  constructor(retryAfterSeconds: number) {
    super(
      `Too many attempts — please wait ${retryAfterSeconds} second${retryAfterSeconds === 1 ? "" : "s"} and try again`,
      429,
      "rate_limited",
    );
  }
}

export interface RateLimit {
  /** What is being limited. Appears in the table, so keep it stable. */
  bucket: string;
  /** Attempts allowed per window. */
  max: number;
  windowSeconds: number;
}

/**
 * Signing in, counted per address. Tight, because the reward for guessing is
 * somebody's account and a single address has no honest reason to fail ten
 * times in five minutes.
 */
export const LOGIN_IP_LIMIT: RateLimit = { bucket: "login-ip", max: 10, windowSeconds: 300 };

/**
 * Signing in, counted per account, which catches the attack the per-address
 * limit cannot: many addresses working through a password list against one
 * known email.
 *
 * Deliberately much looser than the address limit, and it is a real trade. Any
 * per-account limit hands an attacker a way to lock a known account out by
 * burning its budget on purpose — so the threshold sits well above what a
 * person mistyping their own password will ever reach, and a successful sign-in
 * clears it. Stopping the lockout entirely needs something this product does
 * not have yet (a challenge, or trusted-device history); until then, slowing a
 * distributed attack is worth more than the griefing it allows.
 */
export const LOGIN_EMAIL_LIMIT: RateLimit = { bucket: "login-email", max: 50, windowSeconds: 900 };

/**
 * Anonymous writes from the public site — enquiries, applications, bookings.
 * Loose enough that a family filling in three forms is never stopped, tight
 * enough that nobody scripts a thousand fake leads into the admissions pipeline.
 */
export const PUBLIC_FORM_LIMIT: RateLimit = { bucket: "public-form", max: 20, windowSeconds: 600 };

/** Creating an account. */
export const REGISTER_LIMIT: RateLimit = { bucket: "register", max: 5, windowSeconds: 3600 };

/**
 * The caller's address, as far as it can be known.
 *
 * Behind Vercel the client address is the first entry of `x-forwarded-for`; the
 * rest of the list is proxies. A caller who sends no address at all is counted
 * under one shared key rather than waved through — being unidentifiable is not
 * a reason to get unlimited attempts.
 */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first || req.headers.get("x-real-ip") || "unknown";
}

/**
 * Count one attempt against `key`, and throw once the limit is passed.
 *
 * The increment and the read are a single statement: two requests arriving
 * together must not both read a count of 9 and both decide they are allowed.
 * `ON CONFLICT` makes the database settle that, which is the whole reason the
 * counter is here rather than in application code.
 */
export async function enforceRateLimit(limit: RateLimit, key: string): Promise<void> {
  const windowMs = limit.windowSeconds * 1000;
  const now = Date.now();
  const windowStart = new Date(Math.floor(now / windowMs) * windowMs);

  const rows = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" ("id", "bucket", "key", "windowStart", "count")
    VALUES (gen_random_uuid()::text, ${limit.bucket}, ${key}, ${windowStart}, 1)
    ON CONFLICT ("bucket", "key") DO UPDATE
      SET "count" = CASE
            WHEN "RateLimit"."windowStart" = EXCLUDED."windowStart"
              THEN "RateLimit"."count" + 1
            ELSE 1
          END,
          "windowStart" = EXCLUDED."windowStart"
    RETURNING "count"
  `;

  const count = Number(rows[0]?.count ?? 0);
  if (count > limit.max) {
    const retryAfter = Math.max(1, Math.ceil((windowStart.getTime() + windowMs - now) / 1000));
    throw new RateLimitedError(retryAfter);
  }
}

/**
 * Forget a caller's attempts. Called after a successful sign-in so that a
 * parent who mistyped their password four times does not spend the rest of the
 * window one slip away from being locked out of their own account.
 */
export async function clearRateLimit(limit: RateLimit, key: string): Promise<void> {
  await prisma.rateLimit.deleteMany({ where: { bucket: limit.bucket, key } });
}

/**
 * Drop windows that can no longer matter. Nothing reads an expired row — the
 * upsert overwrites it — so this is only about not keeping a row per address
 * for ever. Safe to call from anywhere; it is a delete of dead rows.
 */
export async function pruneRateLimits(olderThanSeconds = 86_400): Promise<number> {
  const { count } = await prisma.rateLimit.deleteMany({
    where: { windowStart: { lt: new Date(Date.now() - olderThanSeconds * 1000) } },
  });
  return count;
}
