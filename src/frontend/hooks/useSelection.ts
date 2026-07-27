"use client";

import { useErpStore } from "@/frontend/store/erpStore";
import { useUiStore } from "@/frontend/store/uiStore";
import { useGuardianId, useStaffId } from "@/frontend/store/session";
import { childrenOfGuardian, classroomsOfStaff } from "@/frontend/store/queries";
import type { Classroom, Student } from "@/shared/types/school.types";

/** The signed-in parent's children plus the one currently in focus. */
export function useSelectedChild(): {
  kids: Student[];
  child: Student | undefined;
  select: (id: string) => void;
} {
  const guardianId = useGuardianId();
  const students = useErpStore((s) => s.students);
  const guardians = useErpStore((s) => s.guardians);
  const selectedId = useUiStore((s) => s.selectedStudentId);
  const select = useUiStore((s) => s.setSelectedStudent);

  const kids = childrenOfGuardian(students, guardians, guardianId);
  const child = kids.find((k) => k.id === selectedId) ?? kids[0];
  return { kids, child, select };
}

/** The signed-in teacher's classrooms plus the one currently in focus. */
export function useSelectedClass(): {
  classes: Classroom[];
  classroom: Classroom | undefined;
  select: (id: string) => void;
} {
  const staffId = useStaffId();
  const classrooms = useErpStore((s) => s.classrooms);
  const staff = useErpStore((s) => s.staff);
  const selectedId = useUiStore((s) => s.selectedClassroomId);
  const select = useUiStore((s) => s.setSelectedClassroom);

  const mine = classroomsOfStaff(classrooms, staff, staffId);
  // Admins previewing the teacher panel have no assigned classes — show all.
  const classes = mine.length ? mine : classrooms;
  const classroom = classes.find((c) => c.id === selectedId) ?? classes[0];
  return { classes, classroom, select };
}

/** Branch scope for admin list pages ("all" = every branch). */
export function useBranchScope() {
  const branches = useErpStore((s) => s.branches);
  const branchFilter = useUiStore((s) => s.branchFilter);
  const setBranchFilter = useUiStore((s) => s.setBranchFilter);
  const inScope = <T extends { branchId?: string | null }>(rows: T[]): T[] =>
    branchFilter === "all" ? rows : rows.filter((r) => !r.branchId || r.branchId === branchFilter);
  return { branches, branchFilter, setBranchFilter, inScope };
}
