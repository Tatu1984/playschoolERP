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

/** Read + verify the current session from the request cookies (server-side). */
export async function getSession(): Promise<SessionClaims | null> {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}

/** Like getSession but throws UnauthorizedError when absent. */
export async function requireSession(): Promise<SessionClaims> {
  const s = await getSession();
  if (!s) throw new UnauthorizedError();
  return s;
}
