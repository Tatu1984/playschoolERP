import { StoreGate } from "@/frontend/components/layout/StoreGate";
import { CmsPagesManager } from "@/frontend/components/features/admin/CmsPagesManager";

export const metadata = { title: "Content — Climb Kiddo Admin" };

export default function Page() {
  return (
    <StoreGate>
      <CmsPagesManager />
    </StoreGate>
  );
}
