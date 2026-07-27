import { StoreGate } from "@/frontend/components/layout/StoreGate";
import { DrawingCanvas } from "@/frontend/components/features/kids/DrawingCanvas";

export default function Page() {
  return (
    <StoreGate>
      <DrawingCanvas />
    </StoreGate>
  );
}
