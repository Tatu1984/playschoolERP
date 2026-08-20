import { StoreGate } from "@/frontend/components/layout/StoreGate";
import { BlogManager } from "@/frontend/components/features/admin/BlogManager";

export const metadata = { title: "Blog — Climb Kiddo Admin" };

export default function Page() {
  return (
    <StoreGate>
      <BlogManager />
    </StoreGate>
  );
}
