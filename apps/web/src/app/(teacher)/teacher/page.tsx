import { StoreGate } from "@/frontend/components/layout/StoreGate";
import { TeacherDashboard } from "@/frontend/components/features/teacher/TeacherDashboard";

export const metadata = { title: "Dashboard — Climb Kiddo Teacher" };

export default function Page() {
  return (
    <StoreGate>
      <TeacherDashboard />
    </StoreGate>
  );
}
