import { NextResponse } from "next/server";
import { sessionCookieAttributes } from "@/lib/gms/auth";

export const runtime = "nodejs";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  const attrs = sessionCookieAttributes();
  res.cookies.set({ ...attrs, value: "", maxAge: 0 });
  return res;
}
