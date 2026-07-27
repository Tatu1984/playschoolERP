import { StoreGate } from "@/frontend/components/layout/StoreGate";
import { MessagesView } from "@/frontend/components/features/parent/MessagesView";

export const metadata = { title: "Messages — Climb Kiddo" };

export default function Page() {
  return (
    <StoreGate>
      <MessagesView />
    </StoreGate>
  );
}
