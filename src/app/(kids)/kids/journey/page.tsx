import { StoreGate } from "@/frontend/components/layout/StoreGate";
import { JourneyMap } from "@/frontend/components/features/kids/JourneyMap";

export default function Page() {
  return (
    <StoreGate>
      <JourneyMap />
    </StoreGate>
  );
}
