"use client";

/** Cross-page UI selections (active child, active class, kids profile). */
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UiState {
  /** Parent portal: which child the pages are showing. */
  selectedStudentId: string | null;
  /** Teacher panel: which classroom is in focus. */
  selectedClassroomId: string | null;
  /** Admin: branch filter applied across list pages. */
  branchFilter: string;
  /** Kids zone: whose progress a session writes to. */
  kidsStudentId: string;
  setSelectedStudent(id: string | null): void;
  setSelectedClassroom(id: string | null): void;
  setBranchFilter(id: string): void;
  setKidsStudent(id: string): void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      selectedStudentId: null,
      selectedClassroomId: null,
      branchFilter: "all",
      kidsStudentId: "stu_aarav",
      setSelectedStudent: (id) => set({ selectedStudentId: id }),
      setSelectedClassroom: (id) => set({ selectedClassroomId: id }),
      setBranchFilter: (id) => set({ branchFilter: id }),
      setKidsStudent: (id) => set({ kidsStudentId: id }),
    }),
    { name: "climbkiddo-ui" },
  ),
);
