import { prisma, type Prisma } from "@/backend/database/client";

export const attendanceRepository = {
  list(where: Prisma.AttendanceRecordWhereInput, take?: number) {
    return prisma.attendanceRecord.findMany({
      where,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      ...(take ? { take } : {}),
    });
  },

  findForDay(studentId: string, date: string) {
    return prisma.attendanceRecord.findUnique({
      where: { studentId_date: { studentId, date } },
    });
  },

  /**
   * One record per child per day. Upsert rather than insert: marking a child
   * present and then correcting it to late must not leave two rows behind.
   */
  upsert(
    studentId: string,
    date: string,
    create: Prisma.AttendanceRecordUncheckedCreateInput,
    update: Prisma.AttendanceRecordUncheckedUpdateInput,
  ) {
    return prisma.attendanceRecord.upsert({
      where: { studentId_date: { studentId, date } },
      create,
      update,
    });
  },

  rosterOf(classroomId: string) {
    return prisma.student.findMany({
      where: { classroomId, status: "ACTIVE" },
      select: { id: true },
    });
  },

  countByStatus(where: Prisma.AttendanceRecordWhereInput) {
    return prisma.attendanceRecord.groupBy({
      by: ["status"],
      where,
      _count: { _all: true },
    });
  },

  listPickupAuths(where: Prisma.PickupAuthorizationWhereInput) {
    return prisma.pickupAuthorization.findMany({ where, orderBy: { createdAt: "desc" } });
  },

  createPickupAuth(data: Prisma.PickupAuthorizationUncheckedCreateInput) {
    return prisma.pickupAuthorization.create({ data });
  },

  findPickupAuthByCode(code: string) {
    return prisma.pickupAuthorization.findUnique({ where: { code } });
  },

  usePickupAuth(id: string) {
    return prisma.pickupAuthorization.update({ where: { id }, data: { used: true } });
  },
};
