import { StoreGate } from "@/frontend/components/layout/StoreGate";
import { BranchesManager } from "@/frontend/components/features/admin/BranchesManager";

export const metadata = { title: "Branches — Climb Kiddo Admin" };

export default function AdminBranchesPage() {
  return (
    <StoreGate>
      <BranchesManager />
    </StoreGate>
  );
}
