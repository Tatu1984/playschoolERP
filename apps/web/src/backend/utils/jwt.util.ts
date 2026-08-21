import { SignJWT, jwtVerify } from "jose";
import { env } from "@/config/env";
import type { Role } from "@/shared/constants/roles";

const authKey = new TextEncoder().encode(env.AUTH_SECRET);
const cctvKey = new TextEncoder().encode(env.CCTV_TOKEN_SECRET);

// ---- Session token (long-lived, HttpOnly cookie) --------------------------

export interface SessionClaims {
  sub: string; // user id
  role: Role;
  email: string;
  name: string;
  branchId: string | null;
  /**
   * Seconds since the epoch, set by `setIssuedAt()` below. Read when deciding
   * whether a session predates a revocation — see `getSession`.
   */
  iat?: number;
}

export async function signSession(claims: SessionClaims): Promise<string> {
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(authKey);
}

export async function verifySession(
  token: string | undefined | null,
): Promise<SessionClaims | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, authKey);
    return payload as unknown as SessionClaims;
  } catch {
    return null;
  }
}

// ---- CCTV view token (short-lived, single camera) -------------------------

export interface ViewTokenClaims {
  sub: string; // user id
  cameraId: string;
  streamPath: string;
}

export async function signViewToken(
  claims: ViewTokenClaims,
  ttlSeconds = 60,
): Promise<string> {
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(cctvKey);
}

export async function verifyViewToken(
  token: string | undefined | null,
): Promise<ViewTokenClaims | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, cctvKey);
    return payload as unknown as ViewTokenClaims;
  } catch {
    return null;
  }
}
