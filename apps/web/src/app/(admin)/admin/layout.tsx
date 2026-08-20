import { redirect } from "next/navigation";
import { getSession } from "@/backend/services/auth.service";
import { isStaff } from "@/backend/utils/rbac.util";
import { PortalShell } from "@/frontend/components/layout/PortalShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login?next=/admin");
  if (!isStaff(session.role)) redirect("/");

  return (
    <PortalShell
      surface="admin"
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
