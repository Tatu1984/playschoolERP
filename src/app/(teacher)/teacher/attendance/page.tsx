import { StoreGate } from "@/frontend/components/layout/StoreGate";
import { AttendanceMarker } from "@/frontend/components/features/teacher/AttendanceMarker";

export const metadata = { title: "Attendance — Climb Kiddo Teacher" };

export default function Page() {
  return (
    <StoreGate>
      <AttendanceMarker />
    </StoreGate>
  );
}
