import { redirect } from "next/navigation";
import { getSession } from "@/backend/services/auth.service";
import { isStaff } from "@/backend/utils/rbac.util";
import { adminService } from "@/backend/services/admin.service";
import { StoreGate } from "@/frontend/components/layout/StoreGate";
import { AdminOverview, type CctvSnapshot } from "@/frontend/components/features/admin/AdminOverview";

export const metadata = { title: "Overview — Climb Kiddo Admin" };
export const dynamic = "force-dynamic";

const OFFLINE: CctvSnapshot = {
  cameras: 0,
  camerasEnabled: 0,
  viewsToday: 0,
  deniedToday: 0,
  recent: [],
  live: false,
};

export default async function AdminOverviewPage() {
  const session = await getSession();
  if (!session || !isStaff(session.role)) redirect("/login?next=/admin");

  // The CCTV block is the one part already backed by Postgres. Keep the page
  // usable (and demo-able) when the database is not running.
  let cctv: CctvSnapshot = OFFLINE;
  try {
    const [stats, activity] = await Promise.all([
      adminService.getOverview(session.role),
      adminService.recentCctvActivity(session.role, 8),
    ]);
    cctv = {
      cameras: stats.cameras,
      camerasEnabled: stats.camerasEnabled,
      viewsToday: stats.viewsToday,
      deniedToday: stats.deniedToday,
      recent: activity.map((a) => ({
        id: a.id,
        userName: a.userName,
        cameraName: a.cameraName,
        action: a.action,
        createdAt: new Date(a.createdAt).toISOString(),
        reason: a.reason ?? null,
      })),
      live: true,
    };
  } catch {
    cctv = OFFLINE;
  }

  return (
    <StoreGate>
      <AdminOverview cctv={cctv} />
    </StoreGate>
  );
}
