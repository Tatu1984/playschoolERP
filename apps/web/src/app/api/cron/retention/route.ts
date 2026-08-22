import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { retentionService } from "@/backend/services/retention.service";
import { toErrorResponse, UnauthorizedError } from "@/backend/utils/error-handler.util";
import { logger } from "@/backend/utils/logger.util";
import { env } from "@/config/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Deleting a year of expired rows on a database that has never been pruned is
// the slowest run this will ever do; every one after it is quick.
export const maxDuration = 300;

/**
 * The nightly prune. Called by Vercel Cron (see `crons` in vercel.json), which
 * presents `Authorization: Bearer $CRON_SECRET`.
 *
 * There is no session here — cron has no user — so the shared secret is the
 * entire authentication, and in production a missing secret means *nobody* may
 * call it. An endpoint that deletes rows and defaults to open is a worse
 * outcome than a retention job that never runs, because one of them is
 * recoverable from a backup and the other is a stranger emptying tables.
 */
export async function GET(req: NextRequest) {
  try {
    authorise(req);
    const result = await retentionService.run();
    return NextResponse.json({ ok: true, deleted: result });
  } catch (e) {
    return toErrorResponse(e);
  }
}

function authorise(req: NextRequest): void {
  const secret = env.CRON_SECRET;

  if (!secret) {
    if (env.isProd) {
      logger.error("Retention endpoint called with no CRON_SECRET configured");
      throw new UnauthorizedError();
    }
    // Locally there is nothing to protect and running it by hand is the point.
    return;
  }

  const presented = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(presented);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new UnauthorizedError();
}
