import { StoreGate } from "@/frontend/components/layout/StoreGate";
import { GamesCatalog } from "@/frontend/components/features/kids/GamesCatalog";

export default function Page() {
  return (
    <StoreGate>
      <GamesCatalog />
    </StoreGate>
  );
}
