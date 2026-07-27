import { StoreGate } from "@/frontend/components/layout/StoreGate";
import { KidsHome } from "@/frontend/components/features/kids/KidsHome";

export default function Page() {
  return (
    <StoreGate>
      <KidsHome />
    </StoreGate>
  );
}
