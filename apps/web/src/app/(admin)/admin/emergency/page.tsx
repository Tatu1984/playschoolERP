import { StoreGate } from "@/frontend/components/layout/StoreGate";
import { SafetyBroadcasts } from "@/frontend/components/features/admin/SafetyBroadcasts";

export const metadata = { title: "Safety broadcasts — Climb Kiddo" };

export default function Page() {
  return (
    <StoreGate>
      <SafetyBroadcasts />
    </StoreGate>
  );
}
