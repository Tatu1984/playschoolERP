import { StoreGate } from "@/frontend/components/layout/StoreGate";
import { PaymentsView } from "@/frontend/components/features/parent/PaymentsView";

export const metadata = { title: "Fees — Climb Kiddo" };

export default function Page() {
  return (
    <StoreGate>
      <PaymentsView />
    </StoreGate>
  );
}
