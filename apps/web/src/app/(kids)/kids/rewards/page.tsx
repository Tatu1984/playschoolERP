import { StoreGate } from "@/frontend/components/layout/StoreGate";
import { RewardLocker } from "@/frontend/components/features/kids/RewardLocker";

export default function Page() {
  return (
    <StoreGate>
      <RewardLocker />
    </StoreGate>
  );
}
