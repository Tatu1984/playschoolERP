"use client";

/**
 * Bridges the server-side JWT session into client components, and resolves it
 * to a demo persona (guardian / staff) inside the fixture dataset so the portal
 * shows *that* user's children, classes and messages.
 */
import { createContext, useContext } from "react";
import type { SafeUser } from "@/shared/types/user.types";
import type { Role } from "@/shared/constants/roles";
import { ROLES } from "@/shared/constants/roles";
import { DEMO_GUARDIAN_ID, GUARDIANS, STAFF } from "@/shared/fixtures";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  branchId: string | null;
}

const FALLBACK: SessionUser = {
  id: "usr_demo",
  name: "Demo User",
  email: "demo@climbkiddo.in",
  role: ROLES.PARENT,
  branchId: "br_kathgola",
};

const SessionContext = createContext<SessionUser>(FALLBACK);

export function SessionProvider({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  return <SessionContext.Provider value={user}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionUser {
  return useContext(SessionContext);
}

/** Server helper: narrow a JWT payload / SafeUser down to what the client needs. */
export function toSessionUser(
  session: Pick<SafeUser, "id" | "name" | "email" | "role" | "branchId"> | null,
): SessionUser {
  if (!session) return FALLBACK;
  return {
    id: session.id,
    name: session.name,
    email: session.email,
    role: session.role,
    branchId: session.branchId ?? "br_kathgola",
  };
}

/**
 * Which fixture guardian the signed-in parent maps to. Matches by email first
 * (parent@example.com → Priya Sharma, same as the DB seed), then falls back to
 * the demo guardian so any parent login has data to look at.
 */
export function useGuardianId(): string {
  const session = useSession();
  const byEmail = GUARDIANS.find((g) => g.email.toLowerCase() === session.email.toLowerCase());
  return byEmail?.id ?? DEMO_GUARDIAN_ID;
}

/**
 * Which fixture staff member the signed-in teacher/admin maps to. Admins get
 * the class-teacher persona for the teacher panel so it is never empty.
 */
export function useStaffId(): string {
  const session = useSession();
  const byEmail = STAFF.find((s) => s.email.toLowerCase() === session.email.toLowerCase());
  if (byEmail) return byEmail.id;
  return session.role === ROLES.TEACHER ? "st_meera" : "st_admin";
}
