import { StoreGate } from "@/frontend/components/layout/StoreGate";
import { NoticesManager } from "@/frontend/components/features/admin/NoticesManager";

export const metadata = { title: "Notices — Climb Kiddo Admin" };

export default function Page() {
  return (
    <StoreGate>
      <NoticesManager />
    </StoreGate>
  );
}
