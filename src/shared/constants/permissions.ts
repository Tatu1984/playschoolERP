import { ROLES, type Role } from "./roles";

/**
 * Coarse-grained permissions checked in the service layer and route adapters.
 * RBAC is enforced server-side (never trust the client / proxy alone).
 */
export const PERMISSIONS = {
  CCTV_VIEW: "cctv:view", // parents watching permitted live cameras
  CCTV_MANAGE: "cctv:manage", // admin: cameras, grants, kill-switch
  CCTV_AUDIT: "cctv:audit", // view the access/watch logs
  STUDENT_MANAGE: "student:manage",
  USER_MANAGE: "user:manage",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS),
  [ROLES.ADMIN]: [
    PERMISSIONS.CCTV_MANAGE,
    PERMISSIONS.CCTV_AUDIT,
    PERMISSIONS.CCTV_VIEW,
    PERMISSIONS.STUDENT_MANAGE,
    PERMISSIONS.USER_MANAGE,
  ],
  [ROLES.TEACHER]: [PERMISSIONS.CCTV_VIEW],
  [ROLES.PARENT]: [PERMISSIONS.CCTV_VIEW],
};

export function roleHasPermission(role: Role, perm: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(perm) ?? false;
}
