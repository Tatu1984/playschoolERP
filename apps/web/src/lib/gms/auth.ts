import { cookies } from "next/headers";
import crypto from "crypto";

export const SESSION_COOKIE = "gms_session";
const SESSION_TTL_DAYS = 7;

function getSecret(): string | null {
  const pwd = process.env.ADMIN_PASSWORD;
  if (!pwd) return null;
  return pwd;
}

export function isConfigured(): boolean {
  return !!process.env.ADMIN_PASSWORD;
}

export function signToken(): string {
  const secret = getSecret();
  if (!secret) throw new Error("ADMIN_PASSWORD not set");
  return crypto.createHmac("sha256", secret).update("gms-valid").digest("hex");
}

export function verifyToken(value: string | undefined | null): boolean {
  if (!value) return false;
  const secret = getSecret();
  if (!secret) return false;
  try {
    const expected = signToken();
    if (expected.length !== value.length) return false;
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(value));
  } catch {
    return false;
  }
}

export function verifyPassword(password: string): boolean {
  const expected = getSecret();
  if (!expected) return false;
  if (expected.length !== password.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(password));
  } catch {
    return false;
  }
}

export async function getSession(): Promise<{ valid: boolean }> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  return { valid: verifyToken(token) };
}

export function sessionCookieAttributes() {
  return {
    name: SESSION_COOKIE,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  };
}
