import { StoreGate } from "@/frontend/components/layout/StoreGate";
import { ClassDetail } from "@/frontend/components/features/teacher/ClassDetail";

export const metadata = { title: "Class — Climb Kiddo Teacher" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <StoreGate>
      <ClassDetail classroomId={id} />
    </StoreGate>
  );
}
