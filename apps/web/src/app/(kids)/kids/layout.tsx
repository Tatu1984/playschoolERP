import { redirect } from "next/navigation";
import { getSession } from "@/backend/services/auth.service";
import { SessionProvider } from "@/frontend/store/session";
import { KidsShell } from "@/frontend/components/features/kids/KidsShell";

export const metadata = {
  title: "Kids Zone — Climb Kiddo",
  description: "Games, stories, drawing and music for little climbers.",
};

/**
 * The kids zone sits behind a parent/staff login (COPPA-style: an adult opens
 * it), but the UI itself is child-facing — big targets, no PII, no external
 * links, no trackers.
 */
export default async function KidsLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login?next=/kids");

  return (
    <SessionProvider
      user={{
        id: session.sub,
        name: session.name,
        email: session.email,
        role: session.role,
        branchId: session.branchId ?? null,
      }}
    >
      <KidsShell>{children}</KidsShell>
    </SessionProvider>
  );
}
