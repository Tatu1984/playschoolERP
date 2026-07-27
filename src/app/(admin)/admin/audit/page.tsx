import { redirect } from "next/navigation";
import { getSession } from "@/backend/services/auth.service";
import { isStaff } from "@/backend/utils/rbac.util";
import { adminService } from "@/backend/services/admin.service";
import { StoreGate } from "@/frontend/components/layout/StoreGate";
import { AuditLogView, type CctvLogRow } from "@/frontend/components/features/admin/AuditLogView";

export const metadata = { title: "Audit log — Climb Kiddo Admin" };
export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  const session = await getSession();
  if (!session || !isStaff(session.role)) redirect("/login?next=/admin/audit");

  let rows: CctvLogRow[] = [];
  let live = false;
  try {
    const activity = await adminService.recentCctvActivity(session.role, 200);
    rows = activity.map((r) => ({
      id: r.id,
      userName: r.userName,
      userRole: r.userRole,
      cameraName: r.cameraName,
      action: r.action,
      reason: r.reason ?? null,
      createdAt: new Date(r.createdAt).toISOString(),
    }));
    live = true;
  } catch {
    rows = [];
  }

  return (
    <StoreGate>
      <AuditLogView cctvRows={rows} live={live} />
    </StoreGate>
  );
}
