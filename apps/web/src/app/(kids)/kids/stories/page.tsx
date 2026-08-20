import { StoreGate } from "@/frontend/components/layout/StoreGate";
import { StoriesList } from "@/frontend/components/features/kids/Stories";

export default function Page() {
  return (
    <StoreGate>
      <StoriesList />
    </StoreGate>
  );
}
