import { StoreGate } from "@/frontend/components/layout/StoreGate";
import { ActivityUploader } from "@/frontend/components/features/teacher/ActivityUploader";

export const metadata = { title: "Activity feed — Climb Kiddo Teacher" };

export default function Page() {
  return (
    <StoreGate>
      <ActivityUploader />
    </StoreGate>
  );
}
