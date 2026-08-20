import { NextRequest, NextResponse } from "next/server";
import {
  isConfigured,
  sessionCookieAttributes,
  signToken,
  verifyPassword,
} from "@/lib/gms/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
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
}
