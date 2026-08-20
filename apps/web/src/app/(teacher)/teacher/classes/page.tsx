import { StoreGate } from "@/frontend/components/layout/StoreGate";
import { ClassList } from "@/frontend/components/features/teacher/ClassList";

export const metadata = { title: "My classes — Climb Kiddo Teacher" };

export default function Page() {
  return (
    <StoreGate>
      <ClassList />
    </StoreGate>
  );
}
