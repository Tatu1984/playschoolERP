import { StoreGate } from "@/frontend/components/layout/StoreGate";
import { StudentsManager } from "@/frontend/components/features/admin/StudentsManager";

export const metadata = { title: "Students — Climb Kiddo Admin" };

export default function AdminStudentsPage() {
  return (
    <StoreGate>
      <StudentsManager />
    </StoreGate>
  );
}
