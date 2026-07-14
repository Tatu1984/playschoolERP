import { NextRequest, NextResponse } from "next/server";
import { cctvService } from "@/backend/services/cctv.service";
import { env } from "@/config/env";

export const runtime = "nodejs";

/**
 * MediaMTX external HTTP auth hook. MediaMTX POSTs a JSON body for every
 * read/publish attempt; we return 200 to permit, 401 to deny.
 *
 * This endpoint is intentionally public (no browser session) — it is called
 * server-to-server by MediaMTX and carries the caller's own credentials
 * (a short-lived view token for reads, internal creds for publishing).
 *
 * See: https://github.com/bluenviron/mediamtx#authentication (external method)
 */
export async function POST(req: NextRequest) {
  // Optional shared-secret gate so only MediaMTX can call this.
  if (env.CCTV_AUTHORIZE_SECRET) {
    const provided = req.headers.get("x-authorize-secret");
    if (provided !== env.CCTV_AUTHORIZE_SECRET) {
      return new NextResponse(null, { status: 401 });
    }
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  const allowed = await cctvService.authorizeMediaAccess({
    action: String(body.action ?? ""),
    path: String(body.path ?? ""),
    token: body.token ? String(body.token) : undefined,
    user: body.user ? String(body.user) : undefined,
    password: body.password ? String(body.password) : undefined,
    ip: body.ip ? String(body.ip) : undefined,
  });

  return new NextResponse(null, { status: allowed ? 200 : 401 });
}
