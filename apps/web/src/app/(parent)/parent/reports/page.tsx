import { StoreGate } from "@/frontend/components/layout/StoreGate";
import { ReportsView } from "@/frontend/components/features/parent/ReportsView";

export const metadata = { title: "Progress — Climb Kiddo" };

export default function Page() {
  return (
    <StoreGate>
      <ReportsView />
    </StoreGate>
  );
}
