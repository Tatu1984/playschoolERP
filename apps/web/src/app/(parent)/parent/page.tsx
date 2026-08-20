import { StoreGate } from "@/frontend/components/layout/StoreGate";
import { ParentDashboard } from "@/frontend/components/features/parent/ParentDashboard";

export const metadata = { title: "Parent Dashboard — Climb Kiddo" };

export default function Page() {
  return (
    <StoreGate>
      <ParentDashboard />
    </StoreGate>
  );
}
