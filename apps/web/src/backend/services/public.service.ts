/**
 * Exactly what the marketing site is allowed to know.
 *
 * The programme and admissions pages want real numbers — how many places are
 * left in Nursery, who teaches it, what a term costs. Those are fair questions
 * from a parent deciding where to send their child, and answering them with
 * live data beats answering them with a hardcoded brochure.
 *
 * But "the public site needs staff" must not become "the public site can read
 * the staff table". So this service returns narrowed shapes: a teacher is a
 * name, a role and an emoji here — never a salary, a phone number or an email.
 * Anything the site does not need is not selected in the first place.
 */
import { prisma } from "@/backend/database/client";
import { toBranch, toCurriculumUnit, toFeeStructure, toProgram } from "@/backend/mappers";
import type { Branch, Program, ProgramSlug } from "@/shared/types/school.types";
import type { CurriculumUnit } from "@/shared/types/learning.types";
import type { FeeStructure } from "@/shared/types/engagement.types";

/** A teacher as a prospective parent may see them. */
export interface PublicTeacher {
  id: string;
  name: string;
  designation: string;
  qualification: string;
  photoEmoji: string;
}

/** A classroom plus how full it is. */
export interface PublicClassroom {
  id: string;
  name: string;
  branchId: string;
  programSlug: ProgramSlug;
  capacity: number;
  enrolled: number;
  room: string;
}

export const publicService = {
  async programs(): Promise<Program[]> {
    return (await prisma.program.findMany({ orderBy: { ageFrom: "asc" } })).map(toProgram);
  },

  async branches(): Promise<Branch[]> {
    return (await prisma.branch.findMany({ where: { active: true }, orderBy: { createdAt: "asc" } })).map(
      toBranch,
    );
  },

  async curriculum(programSlug?: string): Promise<CurriculumUnit[]> {
    const rows = await prisma.curriculumUnit.findMany({
      where: programSlug ? { programSlug } : {},
      orderBy: [{ programSlug: "asc" }, { term: "asc" }],
    });
    return rows.map(toCurriculumUnit);
  },

  /** Fee transparency: what a term actually costs, per branch and programme. */
  async feeStructures(): Promise<FeeStructure[]> {
    return (await prisma.feeStructure.findMany({ orderBy: { programSlug: "asc" } })).map(toFeeStructure);
  },

  async classrooms(programSlug?: string): Promise<PublicClassroom[]> {
    const rows = await prisma.classroom.findMany({
      where: programSlug ? { programSlug } : {},
      select: {
        id: true,
        name: true,
        branchId: true,
        programSlug: true,
        capacity: true,
        room: true,
        _count: { select: { students: { where: { status: "ACTIVE" } } } },
      },
      orderBy: { name: "asc" },
    });
    return rows.map((c) => ({
      id: c.id,
      name: c.name,
      branchId: c.branchId,
      programSlug: c.programSlug as ProgramSlug,
      capacity: c.capacity,
      enrolled: c._count.students,
      room: c.room,
    }));
  },

  /** The teachers who run a programme — narrowed, never the whole record. */
  async teachers(programSlug?: string): Promise<PublicTeacher[]> {
    const rows = await prisma.staff.findMany({
      where: {
        status: "ACTIVE",
        role: "TEACHER",
        ...(programSlug
          ? {
              OR: [
                { classTeacherOf: { some: { programSlug } } },
                { classrooms: { some: { classroom: { programSlug } } } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        designation: true,
        qualification: true,
        photoEmoji: true,
      },
      orderBy: { name: "asc" },
    });
    return rows;
  },

  /** Total children enrolled — the "400 families" number on the home page. */
  async enrolledCount(): Promise<number> {
    return prisma.student.count({ where: { status: "ACTIVE" } });
  },
};
