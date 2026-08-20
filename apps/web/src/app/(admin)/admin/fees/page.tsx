import { StoreGate } from "@/frontend/components/layout/StoreGate";
import { FeesManager } from "@/frontend/components/features/admin/FeesManager";

export const metadata = { title: "Fees — Climb Kiddo Admin" };

export default function Page() {
  return (
    <StoreGate>
      <FeesManager />
    </StoreGate>
  );
}
