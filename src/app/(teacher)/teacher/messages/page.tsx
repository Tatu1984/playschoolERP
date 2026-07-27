import { StoreGate } from "@/frontend/components/layout/StoreGate";
import { TeacherMessages } from "@/frontend/components/features/teacher/TeacherMessages";

export const metadata = { title: "Messages — Climb Kiddo Teacher" };

export default function Page() {
  return (
    <StoreGate>
      <TeacherMessages />
    </StoreGate>
  );
}
