import { StoreGate } from "@/frontend/components/layout/StoreGate";
import { EventsView } from "@/frontend/components/features/parent/EventsView";

export const metadata = { title: "Events — Climb Kiddo" };

export default function Page() {
  return (
    <StoreGate>
      <EventsView />
    </StoreGate>
  );
}
