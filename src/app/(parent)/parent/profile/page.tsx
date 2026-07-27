import { StoreGate } from "@/frontend/components/layout/StoreGate";
import { ProfileView } from "@/frontend/components/features/parent/ProfileView";

export const metadata = { title: "My profile — Climb Kiddo" };

export default function Page() {
  return (
    <StoreGate>
      <ProfileView />
    </StoreGate>
  );
}
