import type { Role } from "@/shared/constants/roles";
import { STAFF_ROLES } from "@/shared/constants/roles";
import { roleHasPermission, type Permission } from "@/shared/constants/permissions";
import { ForbiddenError } from "./error-handler.util";

export function requirePermission(role: Role, perm: Permission): void {
  if (!roleHasPermission(role, perm)) {
    throw new ForbiddenError(`Missing permission: ${perm}`);
  }
}

export function requireRole(role: Role, allowed: Role[]): void {
  if (!allowed.includes(role)) {
    throw new ForbiddenError();
  }
}

export function isStaff(role: Role): boolean {
  return STAFF_ROLES.includes(role);
}
