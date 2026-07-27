import { StoreGate } from "@/frontend/components/layout/StoreGate";
import { NoticesView } from "@/frontend/components/features/parent/NoticesView";

export const metadata = { title: "Notices — Climb Kiddo" };

export default function Page() {
  return (
    <StoreGate>
      <NoticesView />
    </StoreGate>
  );
}
