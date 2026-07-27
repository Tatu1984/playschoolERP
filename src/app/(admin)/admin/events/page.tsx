import { StoreGate } from "@/frontend/components/layout/StoreGate";
import { EventsManager } from "@/frontend/components/features/admin/EventsManager";

export const metadata = { title: "Events — Climb Kiddo Admin" };

export default function Page() {
  return (
    <StoreGate>
      <EventsManager />
    </StoreGate>
  );
}
