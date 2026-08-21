import { cookies } from "next/headers";
import { authRepository } from "@/backend/repositories/auth.repository";
import { hashPassword, verifyPasswordHash } from "@/backend/utils/hash.util";
import { signSession, verifySession, type SessionClaims } from "@/backend/utils/jwt.util";
import { AppError, UnauthorizedError } from "@/backend/utils/error-handler.util";
import { ROLES, type Role } from "@/shared/constants/roles";
import type { SafeUser } from "@/shared/types/user.types";
import type { LoginInput, RegisterInput } from "@/backend/validators/auth.validator";
import { env } from "@/config/env";

export const SESSION_COOKIE = "ps_session";
const SESSION_TTL_DAYS = 7;

type UserRow = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: string;
  branchId: string | null;
  active: boolean;
  passwordHash: string;
};

function toSafeUser(u: UserRow): SafeUser {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    phone: u.phone,
    role: u.role as Role,
    branchId: u.branchId,
    active: u.active,
  };
}

function claimsFor(u: SafeUser): SessionClaims {
  return {
    sub: u.id,
    role: u.role,
    email: u.email,
    name: u.name,
    branchId: u.branchId,
  };
}

export const authService = {
  async register(input: RegisterInput): Promise<SafeUser> {
    const existing = await authRepository.findByEmail(input.email);
    if (existing) {
      throw new AppError("An account with this email already exists", 409, "email_taken");
    }
    const passwordHash = await hashPassword(input.password);
    // Self-registration only ever creates PARENT accounts. Staff roles are
    // provisioned by an admin / seed.
    const user = await authRepository.create({
      email: input.email,
      passwordHash,
      name: input.name,
      phone: input.phone ?? null,
      role: ROLES.PARENT,
    });
    return toSafeUser(user as UserRow);
  },

  async login(input: LoginInput): Promise<{ user: SafeUser; token: string }> {
    const user = await authRepository.findByEmail(input.email);
    if (!user) throw new UnauthorizedError("Invalid email or password");
    const ok = await verifyPasswordHash(input.password, user.passwordHash);
    if (!ok) throw new UnauthorizedError("Invalid email or password");
    if (!user.active) throw new AppError("This account is disabled", 403, "account_disabled");
    const safe = toSafeUser(user as UserRow);
    const token = await signSession(claimsFor(safe));
    return { user: safe, token };
  },
};

// ---- Session cookie helpers -----------------------------------------------

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  };
}

/**
 * Read + verify the current session from the request cookies (server-side).
 *
 * Verifying the signature is not enough. The cookie is a stateless JWT good for
 * seven days, so on its own it says what was true when it was signed — that the
 * holder was this person, and that the account was enabled a week ago. Firing
 * someone, or disabling an account after a phone is lost, has to take effect
 * now, so the account is re-read on every request.
 *
 * That is one query per authenticated request. It buys the ability to revoke a
 * session at all, which for a product holding CCTV of children is not optional.
 */
export async function getSession(): Promise<SessionClaims | null> {
  const store = await cookies();
  const claims = await verifySession(store.get(SESSION_COOKIE)?.value);
  if (!claims) return null;
  return (await sessionStillHolds(claims)) ? claims : null;
}

/**
 * Does the account still stand behind this token? Split out from `getSession`
 * so it can be tested without a request to read cookies from — and so the test
 * exercises this code rather than a copy of it that could agree with a
 * reimplementation while both are wrong.
 */
export async function sessionStillHolds(claims: SessionClaims): Promise<boolean> {
  const user = await authRepository.findSessionState(claims.sub);
  if (!user || !user.active) return false;
  // Null means nothing has ever been revoked for this account.
  if (!user.sessionsValidFrom) return true;

  // `iat` is whole seconds, so both sides are compared in whole seconds. The
  // effect is that a token signed during the same second as a revocation still
  // passes; the alternative — comparing milliseconds — would refuse the fresh
  // token of somebody signing straight back in after "sign out everywhere".
  const validFromSeconds = Math.floor(user.sessionsValidFrom.getTime() / 1000);
  return !(typeof claims.iat === "number" && claims.iat < validFromSeconds);
}

/**
 * Take back every session this account holds, by refusing anything signed
 * before now. This is what disabling an account and "sign out everywhere" both
 * come down to — there is no list of live tokens to delete, because the tokens
 * are not stored anywhere.
 */
export async function revokeSessions(userId: string): Promise<void> {
  await authRepository.setSessionsValidFrom(userId, new Date());
}

/** Like getSession but throws UnauthorizedError when absent. */
export async function requireSession(): Promise<SessionClaims> {
  const s = await getSession();
  if (!s) throw new UnauthorizedError();
  return s;
}
