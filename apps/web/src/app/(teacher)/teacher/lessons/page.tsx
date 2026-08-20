import { StoreGate } from "@/frontend/components/layout/StoreGate";
import { LessonPlanner } from "@/frontend/components/features/teacher/LessonPlanner";

export const metadata = { title: "Lesson planner — Climb Kiddo Teacher" };

export default function Page() {
  return (
    <StoreGate>
      <LessonPlanner />
    </StoreGate>
  );
}
