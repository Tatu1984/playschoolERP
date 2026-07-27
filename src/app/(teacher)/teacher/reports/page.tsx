import { StoreGate } from "@/frontend/components/layout/StoreGate";
import { ReportsEditor } from "@/frontend/components/features/teacher/ReportsEditor";

export const metadata = { title: "Progress reports — Climb Kiddo Teacher" };

export default function Page() {
  return (
    <StoreGate>
      <ReportsEditor />
    </StoreGate>
  );
}
