/**
 * Attendance, the day log, and pickup authorisation (SoW §7.6).
 *
 * The rules that matter here are the ones a parent would notice:
 *
 *  * Only a teacher or admin may mark attendance. A parent reads it.
 *  * Marking a child ABSENT clears their check-in time, because a record
 *    saying "absent, arrived 08:51" is worse than no record.
 *  * A pickup code is single-use and only valid on the day it was issued.
 *    Someone at the gate with yesterday's code is turned away.
 */
import { type Prisma } from "@/backend/database/client";
import { attendanceRepository } from "@/backend/repositories/attendance.repository";
import { toAttendance, toPickupAuthorization } from "@/backend/mappers";
import { AppError, ForbiddenError, NotFoundError } from "@/backend/utils/error-handler.util";
import { requireRole } from "@/backend/utils/rbac.util";
import { canSeeStudent, type Scope } from "@/backend/utils/scope.util";
import { ROLES, type Role } from "@/shared/constants/roles";
import type {
  AttendanceRecord,
  AttendanceStatus,
  PickupAuthorization,
} from "@/shared/types/school.types";

const MARKERS: Role[] = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER];

const todayKey = () => new Date().toISOString().slice(0, 10);

/** Six digits, readable over the phone and awkward to guess in one go. */
const pickupCode = () => String(Math.floor(100000 + Math.random() * 900000));

export interface DayLogPatch {
  note?: string;
  mood?: AttendanceRecord["mood"];
  mealsEaten?: AttendanceRecord["mealsEaten"];
  napMinutes?: number | null;
}

export const attendanceService = {
  scopedWhere(
    scope: Scope,
    filters: { studentId?: string; classroomId?: string; date?: string; from?: string; to?: string },
  ): Prisma.AttendanceRecordWhereInput {
    const where: Prisma.AttendanceRecordWhereInput = {};
    if (filters.studentId) where.studentId = filters.studentId;
    if (filters.classroomId) where.classroomId = filters.classroomId;
    if (filters.date) where.date = filters.date;
    else if (filters.from || filters.to) {
      where.date = { ...(filters.from ? { gte: filters.from } : {}), ...(filters.to ? { lte: filters.to } : {}) };
    }

    if (scope.role === ROLES.PARENT) {
      where.studentId = filters.studentId && scope.studentIds.includes(filters.studentId)
        ? filters.studentId
        : { in: scope.studentIds };
    } else if (scope.role === ROLES.TEACHER) {
      where.classroomId = filters.classroomId && scope.classroomIds.includes(filters.classroomId)
        ? filters.classroomId
        : { in: scope.classroomIds };
    } else if (scope.branchId) {
      where.student = { branchId: scope.branchId };
    }
    return where;
  },

  async list(
    scope: Scope,
    filters: { studentId?: string; classroomId?: string; date?: string; from?: string; to?: string } = {},
  ): Promise<AttendanceRecord[]> {
    const rows = await attendanceRepository.list(this.scopedWhere(scope, filters));
    return rows.map(toAttendance);
  },

  async today(scope: Scope): Promise<AttendanceRecord[]> {
    return this.list(scope, { date: todayKey() });
  },

  async mark(
    scope: Scope,
    input: { studentId: string; classroomId: string; status: AttendanceStatus; date?: string },
  ): Promise<AttendanceRecord> {
    requireRole(scope.role, MARKERS);
    const date = input.date ?? todayKey();
    if (scope.role === ROLES.TEACHER && !scope.classroomIds.includes(input.classroomId)) {
      throw new ForbiddenError("That classroom is not yours to mark");
    }
    const now = new Date();
    // Absent means absent: don't leave a stale arrival time on the record.
    const checkInAt = input.status === "ABSENT" ? null : now;
    const row = await attendanceRepository.upsert(
      input.studentId,
      date,
      {
        studentId: input.studentId,
        classroomId: input.classroomId,
        date,
        status: input.status,
        checkInAt,
        markedByStaffId: scope.staffId,
      },
      {
        status: input.status,
        ...(input.status === "ABSENT"
          ? { checkInAt: null, checkOutAt: null }
          : {}),
        markedByStaffId: scope.staffId,
      },
    );
    return toAttendance(row);
  },

  async markBulk(
    scope: Scope,
    input: { classroomId: string; status: AttendanceStatus; date?: string },
  ): Promise<AttendanceRecord[]> {
    requireRole(scope.role, MARKERS);
    const roster = await attendanceRepository.rosterOf(input.classroomId);
    const out: AttendanceRecord[] = [];
    for (const s of roster) {
      out.push(await this.mark(scope, { ...input, studentId: s.id }));
    }
    return out;
  },

  async checkIn(scope: Scope, studentId: string, classroomId: string): Promise<AttendanceRecord> {
    requireRole(scope.role, MARKERS);
    const date = todayKey();
    await this.mark(scope, { studentId, classroomId, status: "PRESENT", date });
    const row = await attendanceRepository.upsert(
      studentId,
      date,
      { studentId, classroomId, date, status: "PRESENT", checkInAt: new Date() },
      { checkInAt: new Date() },
    );
    return toAttendance(row);
  },

  async checkOut(
    scope: Scope,
    studentId: string,
    pickedUpBy: string,
    code?: string,
  ): Promise<AttendanceRecord> {
    requireRole(scope.role, MARKERS);
    const date = todayKey();
    const existing = await attendanceRepository.findForDay(studentId, date);
    if (!existing) throw new AppError("That child has not been checked in today", 409, "not_checked_in");

    // If a pickup code was presented, it has to be this child's, unused, and
    // for today — otherwise the person at the gate does not get the child.
    if (code) {
      const auth = await attendanceRepository.findPickupAuthByCode(code);
      if (!auth || auth.studentId !== studentId || auth.used || auth.validOn !== date) {
        throw new AppError("That pickup code is not valid today", 403, "bad_pickup_code");
      }
      await attendanceRepository.usePickupAuth(auth.id);
    }

    const row = await attendanceRepository.upsert(
      studentId,
      date,
      {
        studentId,
        classroomId: existing.classroomId,
        date,
        status: existing.status,
        checkOutAt: new Date(),
        pickedUpBy,
      },
      { checkOutAt: new Date(), pickedUpBy },
    );
    return toAttendance(row);
  },

  async updateDayLog(
    scope: Scope,
    studentId: string,
    date: string,
    patch: DayLogPatch,
  ): Promise<AttendanceRecord> {
    requireRole(scope.role, MARKERS);
    const existing = await attendanceRepository.findForDay(studentId, date);
    if (!existing) throw new NotFoundError("No attendance record for that day");
    const row = await attendanceRepository.upsert(studentId, date, { ...existing, ...patch }, patch);
    return toAttendance(row);
  },

  // ------------------------------------------------------------- pickup
  async listPickupAuths(scope: Scope, studentId?: string): Promise<PickupAuthorization[]> {
    const where: Prisma.PickupAuthorizationWhereInput = {};
    if (studentId) {
      if (!canSeeStudent(scope, studentId)) throw new ForbiddenError();
      where.studentId = studentId;
    } else if (scope.role === ROLES.PARENT) {
      where.studentId = { in: scope.studentIds };
    }
    return (await attendanceRepository.listPickupAuths(where)).map(toPickupAuthorization);
  },

  /** Parents authorise someone else to collect their child; staff can too. */
  async authorizePickup(
    scope: Scope,
    input: { studentId: string; personName: string; relation?: string; phone?: string; validOn?: string },
  ): Promise<PickupAuthorization> {
    if (!canSeeStudent(scope, input.studentId)) throw new ForbiddenError();
    const row = await attendanceRepository.createPickupAuth({
      studentId: input.studentId,
      personName: input.personName,
      relation: input.relation ?? "",
      phone: input.phone ?? "",
      code: pickupCode(),
      validOn: input.validOn ?? todayKey(),
      createdByUserId: scope.userId,
    });
    return toPickupAuthorization(row);
  },
};
