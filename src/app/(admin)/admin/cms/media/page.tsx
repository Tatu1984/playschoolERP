import { StoreGate } from "@/frontend/components/layout/StoreGate";
import { MediaLibrary } from "@/frontend/components/features/admin/MediaLibrary";

export const metadata = { title: "Media library — Climb Kiddo Admin" };

export default function Page() {
  return (
    <StoreGate>
      <MediaLibrary />
    </StoreGate>
  );
}
