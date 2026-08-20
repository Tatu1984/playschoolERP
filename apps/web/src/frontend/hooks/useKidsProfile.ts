"use client";

import { useErpStore } from "@/frontend/store/erpStore";
import { useUiStore } from "@/frontend/store/uiStore";
import { useGuardianId } from "@/frontend/store/session";
import { childrenOfGuardian } from "@/frontend/store/queries";
import type { JourneyState } from "@/shared/types/learning.types";
import type { Student } from "@/shared/types/school.types";

const BLANK: JourneyState = {
  studentId: "",
  stars: 0,
  level: 1,
  streakDays: 0,
  lastPlayedOn: null,
  unlockedBadges: [],
  completedGames: [],
  finishedStories: [],
  mascot: "kiki",
};

/**
 * Whose progress the kids zone is writing to. Defaults to the signed-in
 * parent's first child; staff previewing the zone get the demo child.
 */
export function useKidsProfile(): {
  child: Student | undefined;
  kids: Student[];
  journey: JourneyState;
  setKid: (id: string) => void;
} {
  const guardianId = useGuardianId();
  const students = useErpStore((s) => s.students);
  const guardians = useErpStore((s) => s.guardians);
  const journeys = useErpStore((s) => s.journeys);
  const kidsStudentId = useUiStore((s) => s.kidsStudentId);
  const setKid = useUiStore((s) => s.setKidsStudent);

  const mine = childrenOfGuardian(students, guardians, guardianId);
  const kids = mine.length ? mine : students.slice(0, 4);
  const child = kids.find((k) => k.id === kidsStudentId) ?? kids[0];
  const journey = journeys.find((j) => j.studentId === child?.id) ?? { ...BLANK, studentId: child?.id ?? "" };

  return { child, kids, journey, setKid };
}
