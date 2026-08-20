import { StoreGate } from "@/frontend/components/layout/StoreGate";
import { AnalyticsBoard } from "@/frontend/components/features/admin/AnalyticsBoard";

export const metadata = { title: "Analytics — Climb Kiddo Admin" };

export default function Page() {
  return (
    <StoreGate>
      <AnalyticsBoard />
    </StoreGate>
  );
}
