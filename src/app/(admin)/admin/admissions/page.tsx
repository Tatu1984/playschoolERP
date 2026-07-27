import { StoreGate } from "@/frontend/components/layout/StoreGate";
import { AdmissionsPipeline } from "@/frontend/components/features/admin/AdmissionsPipeline";

export const metadata = { title: "Admissions — Climb Kiddo Admin" };

export default function Page() {
  return (
    <StoreGate>
      <AdmissionsPipeline />
    </StoreGate>
  );
}
