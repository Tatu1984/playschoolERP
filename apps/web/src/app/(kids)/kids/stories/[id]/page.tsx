import { StoreGate } from "@/frontend/components/layout/StoreGate";
import { StoryPlayer } from "@/frontend/components/features/kids/Stories";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <StoreGate rows={2}>
      <StoryPlayer storyId={id} />
    </StoreGate>
  );
}
