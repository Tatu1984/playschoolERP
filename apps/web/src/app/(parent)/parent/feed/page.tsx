import { StoreGate } from "@/frontend/components/layout/StoreGate";
import { ActivityFeedView } from "@/frontend/components/features/parent/ActivityFeedView";

export const metadata = { title: "Daily feed — Climb Kiddo" };

export default function Page() {
  return (
    <StoreGate>
      <ActivityFeedView />
    </StoreGate>
  );
}
