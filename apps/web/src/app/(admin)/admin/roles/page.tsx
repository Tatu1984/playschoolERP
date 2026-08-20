import { StoreGate } from "@/frontend/components/layout/StoreGate";
import { RolesManager } from "@/frontend/components/features/admin/RolesManager";

export const metadata = { title: "Roles — Climb Kiddo Admin" };

export default function Page() {
  return (
    <StoreGate>
      <RolesManager />
    </StoreGate>
  );
}
