import { redirect } from "next/navigation";
import { getSession } from "@/backend/services/auth.service";
import { PortalShell } from "@/frontend/components/layout/PortalShell";

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login?next=/parent");

  return (
    <PortalShell
      surface="parent"
      user={{
        id: session.sub,
        name: session.name,
        email: session.email,
        role: session.role,
        branchId: session.branchId ?? null,
      }}
    >
      {children}
    </PortalShell>
  );
}
