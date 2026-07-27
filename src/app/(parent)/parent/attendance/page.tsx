import { StoreGate } from "@/frontend/components/layout/StoreGate";
import { AttendanceView } from "@/frontend/components/features/parent/AttendanceView";

export const metadata = { title: "Attendance — Climb Kiddo" };

export default function Page() {
  return (
    <StoreGate>
      <AttendanceView />
    </StoreGate>
  );
}
