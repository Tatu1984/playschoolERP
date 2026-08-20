import { StoreGate } from "@/frontend/components/layout/StoreGate";
import { MusicStudio } from "@/frontend/components/features/kids/MusicStudio";

export default function Page() {
  return (
    <StoreGate>
      <MusicStudio />
    </StoreGate>
  );
}
