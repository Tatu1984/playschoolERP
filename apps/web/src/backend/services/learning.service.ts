/**
 * Lesson planning, curriculum, progress reports and milestones
 * (SoW §7.4 progress endpoints, §7.12 curriculum).
 *
 * The one rule worth stating plainly: a parent only ever sees a *published*
 * progress report. A half-written assessment of a four-year-old, seen out of
 * context before the teacher has finished it, is exactly the kind of thing that
 * damages trust — so the draft stays in the staffroom until it is signed off.
 */
import { prisma, type Prisma } from "@/backend/database/client";
import { toCurriculumUnit, toLesson, toMilestone, toProgressReport } from "@/backend/mappers";
import { ForbiddenError, NotFoundError } from "@/backend/utils/error-handler.util";
import { requireRole } from "@/backend/utils/rbac.util";
import { canSeeStudent, type Scope } from "@/backend/utils/scope.util";
import { ROLES, type Role } from "@/shared/constants/roles";
import type { CurriculumUnit, Lesson, Milestone, ProgressReport } from "@/shared/types/learning.types";
import type {
  CreateLessonInput,
  CreateMilestoneInput,
  UpsertReportInput,
} from "@/backend/validators/learning.validator";

const TEACHERS: Role[] = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER];

export const learningService = {
  // -------------------------------------------------------------- lessons
  async listLessons(scope: Scope, filters: { classroomId?: string; from?: string; to?: string } = {}): Promise<Lesson[]> {
    requireRole(scope.role, TEACHERS);
    const where: Prisma.LessonWhereInput = {};
    if (filters.classroomId) where.classroomId = filters.classroomId;
    if (scope.role === ROLES.TEACHER) where.classroomId = { in: scope.classroomIds };
    if (filters.from || filters.to) {
      where.date = { ...(filters.from ? { gte: filters.from } : {}), ...(filters.to ? { lte: filters.to } : {}) };
    }
    const rows = await prisma.lesson.findMany({ where, orderBy: [{ date: "asc" }, { slot: "asc" }] });
    return rows.map(toLesson);
  },

  async createLesson(scope: Scope, input: CreateLessonInput): Promise<Lesson> {
    requireRole(scope.role, TEACHERS);
    if (!scope.staffId) throw new ForbiddenError("Only staff plan lessons");
    if (scope.role === ROLES.TEACHER && input.classroomId && !scope.classroomIds.includes(input.classroomId)) {
      throw new ForbiddenError("That classroom is not yours");
    }
    const row = await prisma.lesson.create({ data: { ...input, authorStaffId: scope.staffId } });
    return toLesson(row);
  },

  async updateLesson(scope: Scope, id: string, input: Partial<CreateLessonInput>): Promise<Lesson> {
    requireRole(scope.role, TEACHERS);
    return toLesson(await prisma.lesson.update({ where: { id }, data: input }));
  },

  async deleteLesson(scope: Scope, id: string): Promise<void> {
    requireRole(scope.role, TEACHERS);
    await prisma.lesson.delete({ where: { id } });
  },

  async curriculum(programSlug?: string): Promise<CurriculumUnit[]> {
    const rows = await prisma.curriculumUnit.findMany({
      where: programSlug ? { programSlug } : {},
      orderBy: [{ programSlug: "asc" }, { term: "asc" }],
    });
    return rows.map(toCurriculumUnit);
  },

  // ------------------------------------------------------------- progress
  async listReports(scope: Scope, studentId?: string): Promise<ProgressReport[]> {
    const where: Prisma.ProgressReportWhereInput = {};
    if (scope.role === ROLES.PARENT) {
      // Published only, own children only.
      where.publishedAt = { not: null };
      where.studentId = studentId && scope.studentIds.includes(studentId)
        ? studentId
        : { in: scope.studentIds };
    } else {
      requireRole(scope.role, TEACHERS);
      if (studentId) where.studentId = studentId;
      if (scope.role === ROLES.TEACHER) where.student = { classroomId: { in: scope.classroomIds } };
      else if (scope.branchId) where.student = { branchId: scope.branchId };
    }
    const rows = await prisma.progressReport.findMany({ where, orderBy: { createdAt: "desc" } });
    return rows.map(toProgressReport);
  },

  /** One report per child per term — writing it twice edits the same row. */
  async upsertReport(scope: Scope, input: UpsertReportInput): Promise<ProgressReport> {
    requireRole(scope.role, TEACHERS);
    if (!scope.staffId) throw new ForbiddenError("Only staff write reports");
    const { studentId, term, publish, scores, ...rest } = input;
    const data = {
      ...rest,
      scores: scores as unknown as Prisma.InputJsonValue,
      authorStaffId: scope.staffId,
      ...(publish === undefined ? {} : { publishedAt: publish ? new Date() : null }),
    };
    const row = await prisma.progressReport.upsert({
      where: { studentId_term: { studentId, term } },
      update: data,
      create: { ...data, studentId, term },
    });
    return toProgressReport(row);
  },

  async publishReport(scope: Scope, id: string, publish: boolean): Promise<ProgressReport> {
    requireRole(scope.role, TEACHERS);
    const row = await prisma.progressReport.update({
      where: { id },
      data: { publishedAt: publish ? new Date() : null },
    });
    return toProgressReport(row);
  },

  // ----------------------------------------------------------- milestones
  async listMilestones(scope: Scope, studentId?: string): Promise<Milestone[]> {
    const where: Prisma.MilestoneWhereInput = {};
    if (scope.role === ROLES.PARENT) {
      where.studentId = studentId && scope.studentIds.includes(studentId)
        ? studentId
        : { in: scope.studentIds };
    } else if (studentId) {
      where.studentId = studentId;
    } else if (scope.role === ROLES.TEACHER) {
      where.student = { classroomId: { in: scope.classroomIds } };
    } else if (scope.branchId) {
      where.student = { branchId: scope.branchId };
    }
    const rows = await prisma.milestone.findMany({ where, orderBy: { achievedOn: "desc" } });
    return rows.map(toMilestone);
  },

  async addMilestone(scope: Scope, input: CreateMilestoneInput): Promise<Milestone> {
    requireRole(scope.role, TEACHERS);
    if (!(await canSeeStudent(scope, input.studentId))) throw new ForbiddenError();
    const row = await prisma.milestone.create({
      data: { ...input, achievedOn: new Date(input.achievedOn) },
    });
    return toMilestone(row);
  },

  async deleteMilestone(scope: Scope, id: string): Promise<void> {
    requireRole(scope.role, TEACHERS);
    const existing = await prisma.milestone.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Milestone not found");
    // Being a teacher says you may delete milestones, not whose.
    if (!(await canSeeStudent(scope, existing.studentId))) throw new ForbiddenError();
    await prisma.milestone.delete({ where: { id } });
  },
};
