import { StoreGate } from "@/frontend/components/layout/StoreGate";
import { EmergencyView } from "@/frontend/components/features/parent/EmergencyView";

export const metadata = { title: "Emergency — Climb Kiddo" };

export default function Page() {
  return (
    <StoreGate>
      <EmergencyView />
    </StoreGate>
  );
}
