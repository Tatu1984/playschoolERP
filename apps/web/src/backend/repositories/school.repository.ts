/**
 * Prisma access for the school's structure and people. No business rules here —
 * the service layer owns those; this file only knows how to ask Postgres.
 */
import { prisma, type Prisma } from "@/backend/database/client";

/** Includes that make a row mappable to its shared type. */
export const studentInclude = {
  guardianships: {
    select: { guardianId: true, isPrimary: true, guardian: { select: { name: true } } },
  },
} satisfies Prisma.StudentInclude;

export const staffInclude = {
  classrooms: { select: { classroomId: true } },
} satisfies Prisma.StaffInclude;

export const guardianInclude = {
  guardianships: { select: { studentId: true } },
} satisfies Prisma.GuardianInclude;

export const schoolRepository = {
  // ------------------------------------------------------------- branches
  listBranches(where: Prisma.BranchWhereInput = {}) {
    return prisma.branch.findMany({ where, orderBy: { createdAt: "asc" } });
  },
  findBranch(id: string) {
    return prisma.branch.findUnique({ where: { id } });
  },
  createBranch(data: Prisma.BranchCreateInput) {
    return prisma.branch.create({ data });
  },
  updateBranch(id: string, data: Prisma.BranchUpdateInput) {
    return prisma.branch.update({ where: { id }, data });
  },

  // ------------------------------------------------------------- programs
  listPrograms() {
    return prisma.program.findMany({ orderBy: { ageFrom: "asc" } });
  },
  findProgram(slug: string) {
    return prisma.program.findUnique({ where: { slug } });
  },

  // ----------------------------------------------------------- classrooms
  listClassrooms(where: Prisma.ClassroomWhereInput = {}) {
    return prisma.classroom.findMany({ where, orderBy: { name: "asc" } });
  },
  findClassroom(id: string) {
    return prisma.classroom.findUnique({ where: { id } });
  },
  createClassroom(data: Prisma.ClassroomUncheckedCreateInput) {
    return prisma.classroom.create({ data });
  },
  updateClassroom(id: string, data: Prisma.ClassroomUncheckedUpdateInput) {
    return prisma.classroom.update({ where: { id }, data });
  },
  deleteClassroom(id: string) {
    return prisma.classroom.delete({ where: { id } });
  },

  // ---------------------------------------------------------------- staff
  listStaff(where: Prisma.StaffWhereInput = {}) {
    return prisma.staff.findMany({ where, include: staffInclude, orderBy: { name: "asc" } });
  },
  findStaff(id: string) {
    return prisma.staff.findUnique({ where: { id }, include: staffInclude });
  },
  findStaffByUser(userId: string) {
    return prisma.staff.findUnique({ where: { userId }, include: staffInclude });
  },
  createStaff(data: Prisma.StaffUncheckedCreateInput) {
    return prisma.staff.create({ data, include: staffInclude });
  },
  updateStaff(id: string, data: Prisma.StaffUncheckedUpdateInput) {
    return prisma.staff.update({ where: { id }, data, include: staffInclude });
  },
  async setStaffClassrooms(staffId: string, classroomIds: string[]) {
    await prisma.$transaction([
      prisma.staffClassroom.deleteMany({ where: { staffId } }),
      prisma.staffClassroom.createMany({
        data: classroomIds.map((classroomId) => ({ staffId, classroomId })),
        skipDuplicates: true,
      }),
    ]);
  },

  // ------------------------------------------------------------- students
  listStudents(where: Prisma.StudentWhereInput = {}) {
    return prisma.student.findMany({
      where,
      include: studentInclude,
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    });
  },
  findStudent(id: string) {
    return prisma.student.findUnique({ where: { id }, include: studentInclude });
  },
  createStudent(data: Prisma.StudentUncheckedCreateInput) {
    return prisma.student.create({ data, include: studentInclude });
  },
  updateStudent(id: string, data: Prisma.StudentUncheckedUpdateInput) {
    return prisma.student.update({ where: { id }, data, include: studentInclude });
  },
  deleteStudent(id: string) {
    return prisma.student.delete({ where: { id } });
  },
  countStudents(where: Prisma.StudentWhereInput = {}) {
    return prisma.student.count({ where });
  },

  // ------------------------------------------------------------ guardians
  listGuardians(where: Prisma.GuardianWhereInput = {}) {
    return prisma.guardian.findMany({
      where,
      include: guardianInclude,
      orderBy: { name: "asc" },
    });
  },
  findGuardian(id: string) {
    return prisma.guardian.findUnique({ where: { id }, include: guardianInclude });
  },
  findGuardianByUser(userId: string) {
    return prisma.guardian.findUnique({ where: { userId }, include: guardianInclude });
  },
  createGuardian(data: Prisma.GuardianUncheckedCreateInput) {
    return prisma.guardian.create({ data, include: guardianInclude });
  },
  updateGuardian(id: string, data: Prisma.GuardianUncheckedUpdateInput) {
    return prisma.guardian.update({ where: { id }, data, include: guardianInclude });
  },
  linkGuardian(guardianId: string, studentId: string, isPrimary: boolean) {
    return prisma.guardianship.upsert({
      where: { guardianId_studentId: { guardianId, studentId } },
      update: { isPrimary },
      create: { guardianId, studentId, isPrimary },
    });
  },
  unlinkGuardian(guardianId: string, studentId: string) {
    return prisma.guardianship.deleteMany({ where: { guardianId, studentId } });
  },
};
