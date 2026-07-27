import { StoreGate } from "@/frontend/components/layout/StoreGate";
import { GamePlayer } from "@/frontend/components/features/kids/GamePlayer";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <StoreGate rows={2}>
      <GamePlayer slug={slug} />
    </StoreGate>
  );
}
