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

// ---- Media token (short-lived, single object) -----------------------------

/**
 * The same idea as the CCTV view token, for the same reason and with the same
 * key: a photograph of a child is reachable only with a credential that expires
 * in minutes and names exactly one object.
 *
 * It exists for the clients that cannot send the session cookie — the mobile
 * app, and anything rendering into an `<img>` outside the portal's origin. In
 * the portal itself the cookie is sent and the route checks the session
 * directly, which is stronger, because a token in a URL ends up in browser
 * history and in screenshots.
 */
export interface MediaTokenClaims {
  sub: string; // user id the token was minted for
  mediaId: string;
}

export async function signMediaToken(
  claims: MediaTokenClaims,
  ttlSeconds = 300,
): Promise<string> {
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(cctvKey);
}

export async function verifyMediaToken(
  token: string | undefined | null,
): Promise<MediaTokenClaims | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, cctvKey);
    const claims = payload as unknown as MediaTokenClaims;
    // A CCTV view token is signed with the same key and would otherwise verify
    // here. It says `cameraId`, not `mediaId`, and must not open a photograph.
    return claims.mediaId ? claims : null;
  } catch {
    return null;
  }
}
