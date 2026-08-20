/**
 * Branches, programs, classrooms, staff, students and guardians — the records
 * every other module hangs off.
 *
 * The rules that live here rather than in a route or a component:
 *
 *  * Who may read what. A parent asking for "students" gets their own children;
 *    a teacher gets their classrooms; an admin gets the branch. Same endpoint.
 *  * Enrolling a child can create a guardian and a login in one step, because
 *    that is what actually happens at an admissions desk.
 *  * Admission numbers are issued here, so two simultaneous enrolments cannot
 *    both claim CK2026107.
 */
import { prisma, type Prisma } from "@/backend/database/client";
import { schoolRepository } from "@/backend/repositories/school.repository";
import {
  toBranch,
  toClassroom,
  toGuardian,
  toProgram,
  toStaff,
  toStudent,
} from "@/backend/mappers";
import { hashPassword } from "@/backend/utils/hash.util";
import { AppError, ForbiddenError, NotFoundError } from "@/backend/utils/error-handler.util";
import { requireRole } from "@/backend/utils/rbac.util";
import { branchWhere, canSeeStudent, type Scope } from "@/backend/utils/scope.util";
import { ROLES, type Role } from "@/shared/constants/roles";
import type { Branch, Classroom, Guardian, Program, Staff, Student } from "@/shared/types/school.types";
import type {
  CreateBranchInput,
  CreateClassroomInput,
  CreateGuardianInput,
  CreateStaffInput,
  CreateStudentInput,
  UpdateBranchInput,
  UpdateClassroomInput,
  UpdateGuardianInput,
  UpdateStaffInput,
  UpdateStudentInput,
} from "@/backend/validators/school.validator";

const ADMINS: Role[] = [ROLES.SUPER_ADMIN, ROLES.ADMIN];
const STAFF: Role[] = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER];

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** A date-only string or an ISO timestamp, both of which the API accepts. */
const toDate = (v: string | undefined, fallback: Date = new Date()): Date =>
  v ? new Date(v.length === 10 ? `${v}T00:00:00.000Z` : v) : fallback;

/**
 * Next free admission number for the year, e.g. CK2026107. Taking the max
 * inside a transaction is what stops two enrolments colliding.
 */
async function nextAdmissionNo(tx: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `CK${year}`;
  const last = await tx.student.findFirst({
    where: { admissionNo: { startsWith: prefix } },
    orderBy: { admissionNo: "desc" },
    select: { admissionNo: true },
  });
  const seq = last ? Number.parseInt(last.admissionNo.slice(prefix.length), 10) + 1 : 101;
  return `${prefix}${seq}`;
}

export const schoolService = {
  // ------------------------------------------------------------- branches
  async listBranches(scope: Scope): Promise<Branch[]> {
    // Everyone sees the branch list — it is on the public site — but a
    // non-super-admin only ever sees the one they belong to in the portal.
    const where = scope.role === ROLES.SUPER_ADMIN || !scope.branchId
      ? {}
      : { id: scope.branchId };
    return (await schoolRepository.listBranches(where)).map(toBranch);
  },

  async createBranch(scope: Scope, input: CreateBranchInput): Promise<Branch> {
    requireRole(scope.role, [ROLES.SUPER_ADMIN]);
    const row = await schoolRepository.createBranch({
      ...input,
      slug: input.slug ?? slugify(input.name),
    });
    return toBranch(row);
  },

  async updateBranch(scope: Scope, id: string, input: UpdateBranchInput): Promise<Branch> {
    requireRole(scope.role, ADMINS);
    if (scope.role === ROLES.ADMIN && scope.branchId !== id) throw new ForbiddenError();
    return toBranch(await schoolRepository.updateBranch(id, input));
  },

  // ------------------------------------------------------------- programs
  async listPrograms(): Promise<Program[]> {
    return (await schoolRepository.listPrograms()).map(toProgram);
  },

  async getProgram(slug: string): Promise<Program> {
    const row = await schoolRepository.findProgram(slug);
    if (!row) throw new NotFoundError("Program not found");
    return toProgram(row);
  },

  // ----------------------------------------------------------- classrooms
  async listClassrooms(scope: Scope, branchId?: string): Promise<Classroom[]> {
    const where: Prisma.ClassroomWhereInput = { ...branchWhere(scope) };
    if (branchId) where.branchId = branchId;
    if (scope.role === ROLES.PARENT) where.id = { in: scope.classroomIds };
    return (await schoolRepository.listClassrooms(where)).map(toClassroom);
  },

  async createClassroom(scope: Scope, input: CreateClassroomInput): Promise<Classroom> {
    requireRole(scope.role, ADMINS);
    return toClassroom(await schoolRepository.createClassroom(input));
  },

  async updateClassroom(
    scope: Scope,
    id: string,
    input: UpdateClassroomInput,
  ): Promise<Classroom> {
    requireRole(scope.role, ADMINS);
    return toClassroom(await schoolRepository.updateClassroom(id, input));
  },

  async deleteClassroom(scope: Scope, id: string): Promise<void> {
    requireRole(scope.role, ADMINS);
    const students = await schoolRepository.countStudents({ classroomId: id });
    if (students > 0) {
      throw new AppError(
        `That classroom still has ${students} ${students === 1 ? "child" : "children"} in it. Move them first.`,
        409,
        "classroom_not_empty",
      );
    }
    await schoolRepository.deleteClassroom(id);
  },

  // ---------------------------------------------------------------- staff
  async listStaff(scope: Scope): Promise<Staff[]> {
    requireRole(scope.role, STAFF);
    return (await schoolRepository.listStaff(branchWhere(scope))).map(toStaff);
  },

  async createStaff(scope: Scope, input: CreateStaffInput): Promise<Staff> {
    requireRole(scope.role, ADMINS);
    const { classroomIds, password, joinedOn, ...rest } = input;

    const row = await prisma.$transaction(async (tx) => {
      // A staff member with a password gets a login; without one they are an
      // HR record until an admin invites them.
      let userId: string | null = null;
      if (password) {
        const user = await tx.user.create({
          data: {
            email: rest.email,
            passwordHash: await hashPassword(password),
            name: rest.name,
            phone: rest.phone,
            role: rest.role,
            branchId: rest.branchId,
          },
        });
        userId = user.id;
      }
      const staff = await tx.staff.create({
        data: { ...rest, joinedOn: toDate(joinedOn), userId },
      });
      if (classroomIds.length) {
        await tx.staffClassroom.createMany({
          data: classroomIds.map((classroomId) => ({ staffId: staff.id, classroomId })),
          skipDuplicates: true,
        });
      }
      return tx.staff.findUniqueOrThrow({
        where: { id: staff.id },
        include: { classrooms: { select: { classroomId: true } } },
      });
    });

    return toStaff(row);
  },

  async updateStaff(scope: Scope, id: string, input: UpdateStaffInput): Promise<Staff> {
    requireRole(scope.role, ADMINS);
    const { classroomIds, joinedOn, ...rest } = input;
    if (classroomIds) await schoolRepository.setStaffClassrooms(id, classroomIds);
    const row = await schoolRepository.updateStaff(id, {
      ...rest,
      ...(joinedOn ? { joinedOn: toDate(joinedOn) } : {}),
    });
    // Keep the login in step: a resigned teacher must stop being able to log in.
    if (row.userId && (rest.status || rest.role || rest.name)) {
      await prisma.user.update({
        where: { id: row.userId },
        data: {
          ...(rest.name ? { name: rest.name } : {}),
          ...(rest.role ? { role: rest.role } : {}),
          ...(rest.status ? { active: rest.status === "ACTIVE" } : {}),
        },
      });
    }
    return toStaff(row);
  },

  // ------------------------------------------------------------- students
  studentWhere(scope: Scope, filters: { classroomId?: string; branchId?: string } = {}) {
    const where: Prisma.StudentWhereInput = { ...branchWhere(scope) };
    if (filters.branchId) where.branchId = filters.branchId;
    if (filters.classroomId) where.classroomId = filters.classroomId;
    if (scope.role === ROLES.PARENT) where.id = { in: scope.studentIds };
    if (scope.role === ROLES.TEACHER) where.classroomId = { in: scope.classroomIds };
    return where;
  },

  async listStudents(
    scope: Scope,
    filters: { classroomId?: string; branchId?: string } = {},
  ): Promise<Student[]> {
    const rows = await schoolRepository.listStudents(this.studentWhere(scope, filters));
    return rows.map(toStudent);
  },

  async getStudent(scope: Scope, id: string): Promise<Student> {
    const row = await schoolRepository.findStudent(id);
    if (!row) throw new NotFoundError("Student not found");
    if (!canSeeStudent(scope, id)) throw new ForbiddenError();
    if (scope.role === ROLES.TEACHER && row.classroomId && !scope.classroomIds.includes(row.classroomId)) {
      throw new ForbiddenError();
    }
    return toStudent(row);
  },

  async createStudent(scope: Scope, input: CreateStudentInput): Promise<Student> {
    requireRole(scope.role, ADMINS);
    const { guardian, dob, enrolledOn, admissionNo, ...rest } = input;

    const row = await prisma.$transaction(async (tx) => {
      const student = await tx.student.create({
        data: {
          ...rest,
          dob: toDate(dob),
          enrolledOn: toDate(enrolledOn),
          admissionNo: admissionNo ?? (await nextAdmissionNo(tx)),
        },
      });

      if (guardian) {
        const { createLogin, ...g } = guardian;
        // Reuse an existing guardian record when the email already belongs to
        // one — siblings share a parent, and duplicating them would split the
        // family's notifications in two.
        const existing = await tx.guardian.findUnique({ where: { email: g.email } });
        let guardianId = existing?.id;
        if (!guardianId) {
          let userId: string | null = null;
          if (createLogin) {
            const user = await tx.user.upsert({
              where: { email: g.email },
              update: {},
              create: {
                email: g.email,
                // Invited, not yet activated: an unusable hash until they set a
                // password through the reset flow.
                passwordHash: await hashPassword(crypto.randomUUID()),
                name: g.name,
                phone: g.phone,
                role: ROLES.PARENT,
              },
            });
            userId = user.id;
          }
          guardianId = (await tx.guardian.create({ data: { ...g, userId } })).id;
        }
        await tx.guardianship.create({
          data: { guardianId, studentId: student.id, isPrimary: true },
        });
      }

      return tx.student.findUniqueOrThrow({
        where: { id: student.id },
        include: {
          guardianships: {
            select: { guardianId: true, isPrimary: true, guardian: { select: { name: true } } },
          },
        },
      });
    });

    return toStudent(row);
  },

  async updateStudent(scope: Scope, id: string, input: UpdateStudentInput): Promise<Student> {
    requireRole(scope.role, ADMINS);
    const { dob, enrolledOn, ...rest } = input;
    const row = await schoolRepository.updateStudent(id, {
      ...rest,
      ...(dob ? { dob: toDate(dob) } : {}),
      ...(enrolledOn ? { enrolledOn: toDate(enrolledOn) } : {}),
    });
    return toStudent(row);
  },

  async deleteStudent(scope: Scope, id: string): Promise<void> {
    requireRole(scope.role, [ROLES.SUPER_ADMIN]);
    await schoolRepository.deleteStudent(id);
  },

  // ------------------------------------------------------------ guardians
  async listGuardians(scope: Scope): Promise<Guardian[]> {
    if (scope.role === ROLES.PARENT) {
      // A parent sees the other guardians of their own children (who can pick
      // up, who is the emergency contact) — nobody else's family.
      const rows = await schoolRepository.listGuardians({
        guardianships: { some: { studentId: { in: scope.studentIds } } },
      });
      return rows.map(toGuardian);
    }
    requireRole(scope.role, STAFF);
    const rows = await schoolRepository.listGuardians(
      scope.branchId && scope.role !== ROLES.SUPER_ADMIN
        ? { guardianships: { some: { student: { branchId: scope.branchId } } } }
        : {},
    );
    return rows.map(toGuardian);
  },

  async createGuardian(scope: Scope, input: CreateGuardianInput): Promise<Guardian> {
    requireRole(scope.role, ADMINS);
    const { studentIds, createLogin, ...rest } = input;
    const row = await prisma.$transaction(async (tx) => {
      let userId: string | null = null;
      if (createLogin) {
        const user = await tx.user.upsert({
          where: { email: rest.email },
          update: {},
          create: {
            email: rest.email,
            passwordHash: await hashPassword(crypto.randomUUID()),
            name: rest.name,
            phone: rest.phone,
            role: ROLES.PARENT,
          },
        });
        userId = user.id;
      }
      const guardian = await tx.guardian.create({ data: { ...rest, userId } });
      if (studentIds.length) {
        await tx.guardianship.createMany({
          data: studentIds.map((studentId, i) => ({
            guardianId: guardian.id,
            studentId,
            isPrimary: i === 0,
          })),
          skipDuplicates: true,
        });
      }
      return tx.guardian.findUniqueOrThrow({
        where: { id: guardian.id },
        include: { guardianships: { select: { studentId: true } } },
      });
    });
    return toGuardian(row);
  },

  async updateGuardian(scope: Scope, id: string, input: UpdateGuardianInput): Promise<Guardian> {
    const guardian = await schoolRepository.findGuardian(id);
    if (!guardian) throw new NotFoundError("Guardian not found");
    // A parent may edit their own contact details; only an admin may edit
    // anyone else's, or change who is allowed to collect a child.
    const isSelf = guardian.userId === scope.userId;
    if (!isSelf) requireRole(scope.role, ADMINS);
    const patch = isSelf && scope.role === ROLES.PARENT
      ? { phone: input.phone, address: input.address, occupation: input.occupation }
      : input;
    const { studentIds, ...rest } = patch as UpdateGuardianInput;
    if (studentIds) {
      requireRole(scope.role, ADMINS);
      await prisma.$transaction([
        prisma.guardianship.deleteMany({ where: { guardianId: id } }),
        prisma.guardianship.createMany({
          data: studentIds.map((studentId, i) => ({
            guardianId: id,
            studentId,
            isPrimary: i === 0,
          })),
          skipDuplicates: true,
        }),
      ]);
    }
    return toGuardian(await schoolRepository.updateGuardian(id, rest));
  },
};
