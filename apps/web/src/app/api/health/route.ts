import { NextResponse } from "next/server";
import { prisma } from "@/backend/database/client";
import { paymentGateway } from "@/backend/integrations/payments";
import { logger } from "@/backend/utils/logger.util";

export const runtime = "nodejs";
// Never cached: a cached health check reports how things were, which is the one
// thing a health check must not do.
export const dynamic = "force-dynamic";

/**
 * Is this instance able to do its job?
 *
 * Deliberately more than "the process is up" — a Next.js instance answers
 * requests perfectly well with an unreachable database, and every one of them
 * is a 500. So this actually asks the database something, and reports which
 * payment driver booted, because "disabled" in production means fees are quietly
 * uncollectable and nobody would otherwise find out until a parent complained.
 *
 * It is public, so it says nothing a stranger could use: no connection strings,
 * no versions, no error text. Up or down, and how long the database took.
 */
export async function GET() {
  const startedAt = Date.now();
  let database: "up" | "down" = "down";

  try {
    await prisma.$queryRaw`SELECT 1`;
    database = "up";
  } catch (e) {
    // Logged in full server-side; the response stays a single word.
    logger.error("Health check could not reach the database", e);
  }

  const healthy = database === "up";
  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      database,
      databaseLatencyMs: Date.now() - startedAt,
      payments: paymentGateway.name,
      time: new Date().toISOString(),
    },
    {
      status: healthy ? 200 : 503,
      headers: { "cache-control": "no-store" },
    },
  );
}
