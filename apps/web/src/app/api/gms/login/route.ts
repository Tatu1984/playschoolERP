import { NextRequest, NextResponse } from "next/server";
import {
  isConfigured,
  sessionCookieAttributes,
  signToken,
  verifyPassword,
} from "@/lib/gms/auth";
import { clientIp, enforceRateLimit, LOGIN_IP_LIMIT } from "@/backend/utils/rate-limit.util";
import { toErrorResponse } from "@/backend/utils/error-handler.util";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // One shared password with no identity behind it is the weakest login in
    // the product, so it gets the same treatment as the real one — otherwise it
    // is the obvious thing to sit and guess at. Being over the limit is a 429,
    // which is why this is inside the try: thrown out of it, it would surface
    // as a 500 and read as a bug rather than a refusal.
    await enforceRateLimit(LOGIN_IP_LIMIT, `gms:${clientIp(req)}`);

    if (!isConfigured()) {
      return NextResponse.json(
        { error: "ADMIN_PASSWORD env var not set on the server." },
        { status: 503 },
      );
    }
    const { password } = await req.json().catch(() => ({ password: "" }));
    if (!verifyPassword(String(password ?? ""))) {
      return NextResponse.json({ error: "Wrong password" }, { status: 401 });
    }
    const res = NextResponse.json({ ok: true });
    const attrs = sessionCookieAttributes();
    res.cookies.set({ ...attrs, value: signToken() });
    return res;
  } catch (e) {
    return toErrorResponse(e);
  }
}
