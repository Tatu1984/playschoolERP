import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/backend/utils/logger.util";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Where the browser posts what the policy would have blocked.
 *
 * The strict policy ships as `Content-Security-Policy-Report-Only` (see
 * src/config/security-headers.ts), which means it blocks nothing and reports
 * everything. This endpoint is the only reason that mode is worth anything:
 * without somewhere for the reports to land, report-only is a policy nobody
 * ever learns the violations of, and it never gets promoted to enforced.
 *
 * Public and unauthenticated by necessity — the browser sends these without
 * credentials, and a violation on the sign-in page has no session to send. So
 * it is treated as hostile input throughout: bounded, never echoed, and it
 * writes nothing to the database. Anyone can post noise here; the worst they
 * achieve is noise in the log.
 */

/** Anything larger than this is not a violation report. */
const MAX_BODY_BYTES = 8 * 1024;

/** One line each, so a flood is skimmable rather than a wall of JSON. */
const FIELDS = [
  "document-uri",
  "violated-directive",
  "effective-directive",
  "blocked-uri",
  "source-file",
  "line-number",
] as const;

export async function POST(req: NextRequest) {
  const raw = await req.text();

  // 204 either way: a browser has nothing useful to do with an error here, and
  // saying which malformed shapes are rejected only helps someone probing.
  if (raw.length === 0 || raw.length > MAX_BODY_BYTES) return noContent();

  let report: Record<string, unknown> | undefined;
  try {
    const parsed: unknown = JSON.parse(raw);
    // Two wire formats: the original `{"csp-report": {...}}` and the newer
    // Reporting API array of `{type, body}`. Both are still in the wild.
    if (parsed && typeof parsed === "object") {
      if (Array.isArray(parsed)) {
        const first = parsed[0] as { body?: Record<string, unknown> } | undefined;
        report = first?.body;
      } else {
        const wrapped = parsed as { "csp-report"?: Record<string, unknown> };
        report = wrapped["csp-report"] ?? (parsed as Record<string, unknown>);
      }
    }
  } catch {
    return noContent();
  }

  if (!report) return noContent();

  const fields: Record<string, unknown> = {};
  for (const key of FIELDS) {
    const value = report[key] ?? report[toCamel(key)];
    // Truncated: a `blocked-uri` can be a multi-kilobyte data: URL, and the
    // part that identifies it is at the front.
    if (typeof value === "string") fields[toCamel(key)] = value.slice(0, 300);
    else if (typeof value === "number") fields[toCamel(key)] = value;
  }

  logger.warn("CSP violation reported", fields);
  return noContent();
}

function noContent() {
  return new NextResponse(null, { status: 204, headers: { "cache-control": "no-store" } });
}

function toCamel(key: string): string {
  return key.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}
