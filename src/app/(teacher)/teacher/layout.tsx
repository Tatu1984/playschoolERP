import { redirect } from "next/navigation";
import { getSession } from "@/backend/services/auth.service";
import { isStaff } from "@/backend/utils/rbac.util";
import { ROLES } from "@/shared/constants/roles";
import { PortalShell } from "@/frontend/components/layout/PortalShell";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login?next=/teacher");
  // Admins can preview the teacher panel; parents cannot.
  if (session.role !== ROLES.TEACHER && !isStaff(session.role)) redirect("/");

  return (
    <PortalShell
      surface="teacher"
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
