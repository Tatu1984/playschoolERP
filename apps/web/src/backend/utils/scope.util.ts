/**
 * Who is allowed to see which rows.
 *
 * The three portals look at the same tables through very different windows:
 *
 *  * SUPER_ADMIN sees every branch.
 *  * ADMIN sees their own branch.
 *  * TEACHER sees the classrooms they teach.
 *  * PARENT sees their own children, and nothing about anyone else's.
 *
 * Resolving that once, here, is what stops each service from re-deriving it
 * slightly differently — the failure mode being a parent who can read another
 * family's feed. Services take a `Scope` and translate it into a `where`.
 */
import { prisma } from "@/backend/database/client";
import { ROLES, type Role } from "@/shared/constants/roles";
import type { Session } from "./route.util";

export interface Scope {
  userId: string;
  role: Role;
  /** Display name of the logged-in person — comments and notices are signed. */
  name: string;
  /** null for SUPER_ADMIN (all branches) and for parents (derived per child). */
  branchId: string | null;
  /** Staff id when this login is a staff member. */
  staffId: string | null;
  /** Children of this login (parents). Empty for staff. */
  studentIds: string[];
  /** Classrooms this login teaches (teachers) or all in-branch (admins). */
  classroomIds: string[];
}

const isAdmin = (role: Role) => role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN;

export async function resolveScope(session: Session): Promise<Scope> {
  const base: Scope = {
    userId: session.sub,
    role: session.role,
    name: session.name,
    branchId: session.role === ROLES.SUPER_ADMIN ? null : session.branchId,
    staffId: null,
    studentIds: [],
    classroomIds: [],
  };

  if (session.role === ROLES.PARENT) {
    const rows = await prisma.guardianship.findMany({
      where: { guardian: { userId: session.sub } },
      select: { studentId: true, student: { select: { classroomId: true, branchId: true } } },
    });
    base.studentIds = rows.map((r) => r.studentId);
    base.classroomIds = [
      ...new Set(rows.map((r) => r.student.classroomId).filter((c): c is string => !!c)),
    ];
    // A parent's "branch" is wherever their children are, not a column on them.
    base.branchId = rows[0]?.student.branchId ?? null;
    return base;
  }

  const staff = await prisma.staff.findUnique({
    where: { userId: session.sub },
    select: {
      id: true,
      branchId: true,
      classrooms: { select: { classroomId: true } },
      classTeacherOf: { select: { id: true } },
    },
  });

  if (staff) {
    base.staffId = staff.id;
    if (session.role !== ROLES.SUPER_ADMIN) base.branchId = staff.branchId;
    base.classroomIds = [
      ...new Set([
        ...staff.classrooms.map((c) => c.classroomId),
        ...staff.classTeacherOf.map((c) => c.id),
      ]),
    ];
  }

  if (isAdmin(session.role)) {
    // Admins run the branch, not a class — give them every room in it so
    // classroom-scoped queries work without special-casing the role.
    const rooms = await prisma.classroom.findMany({
      where: base.branchId ? { branchId: base.branchId } : {},
      select: { id: true },
    });
    base.classroomIds = rooms.map((r) => r.id);
  }

  return base;
}

/** `where` fragment restricting a branch-scoped table to what `scope` may see. */
export function branchWhere(scope: Scope): { branchId?: string } {
  return scope.branchId && scope.role !== ROLES.SUPER_ADMIN
    ? { branchId: scope.branchId }
    : {};
}

/** Student ids this scope may read, or `null` meaning "no restriction". */
export function studentFilter(scope: Scope): { in: string[] } | null {
  if (scope.role === ROLES.PARENT) return { in: scope.studentIds };
  return null;
}

export function canSeeStudent(scope: Scope, studentId: string): boolean {
  if (scope.role === ROLES.PARENT) return scope.studentIds.includes(studentId);
  return true;
}
