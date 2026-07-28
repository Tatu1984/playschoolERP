import { StoreGate } from "@/frontend/components/layout/StoreGate";
import { InvoicesView } from "@/frontend/components/features/parent/InvoicesView";

export const metadata = { title: "Invoices & receipts — Climb Kiddo" };

export default function Page() {
  return (
    <StoreGate>
      <InvoicesView />
    </StoreGate>
  );
}
