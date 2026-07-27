import { StoreGate } from "@/frontend/components/layout/StoreGate";
import { SettingsView } from "@/frontend/components/features/parent/SettingsView";

export const metadata = { title: "Settings — Climb Kiddo" };

export default function Page() {
  return (
    <StoreGate>
      <SettingsView />
    </StoreGate>
  );
}
