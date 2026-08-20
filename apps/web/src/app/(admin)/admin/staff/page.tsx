import { StoreGate } from "@/frontend/components/layout/StoreGate";
import { StaffManager } from "@/frontend/components/features/admin/StaffManager";

export const metadata = { title: "Staff — Climb Kiddo Admin" };

export default function AdminStaffPage() {
  return (
    <StoreGate>
      <StaffManager />
    </StoreGate>
  );
}
