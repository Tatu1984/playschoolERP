import { StoreGate } from "@/frontend/components/layout/StoreGate";
import { SettingsPanel } from "@/frontend/components/features/admin/SettingsPanel";

export const metadata = { title: "Settings — Climb Kiddo Admin" };

export default function Page() {
  return (
    <StoreGate>
      <SettingsPanel />
    </StoreGate>
  );
}
