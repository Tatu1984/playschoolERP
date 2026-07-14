/**
 * Role hierarchy for the ERP. Mirrors the `Role` enum in the Prisma schema.
 * Keep this file and prisma/schema.prisma in sync.
 */
export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  TEACHER: "TEACHER",
  PARENT: "PARENT",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ALL_ROLES: Role[] = Object.values(ROLES);

/** Roles that can administer the school (branch/staff/CCTV config, etc.). */
export const STAFF_ROLES: Role[] = [ROLES.SUPER_ADMIN, ROLES.ADMIN];

/** Which route-group prefix each role lands on after login. */
export const ROLE_HOME: Record<Role, string> = {
  SUPER_ADMIN: "/admin",
  ADMIN: "/admin",
  TEACHER: "/teacher",
  PARENT: "/parent",
};
