import { prisma } from "@/backend/database/client";
import { cctvRepository } from "@/backend/repositories/cctv.repository";
import { requirePermission } from "@/backend/utils/rbac.util";
import { PERMISSIONS } from "@/shared/constants/permissions";
import { STAFF_ROLES, type Role } from "@/shared/constants/roles";

export interface OverviewStats {
  students: number;
  cameras: number;
  camerasEnabled: number;
  staff: number;
  parents: number;
  viewsToday: number; // successful view starts today
  deniedToday: number; // access denials today
}

export interface CctvActivityRow {
  id: string;
  createdAt: Date;
  action: string;
  reason: string | null;
  userName: string;
  userRole: string;
  cameraName: string;
}

function startOfTodayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export const adminService = {
  async getOverview(role: Role): Promise<OverviewStats> {
    requirePermission(role, PERMISSIONS.CCTV_AUDIT);
    const since = startOfTodayUTC();
    const [students, cameras, camerasEnabled, staff, parents, viewsToday, deniedToday] =
      await Promise.all([
        prisma.student.count({ where: { active: true } }),
        prisma.camera.count(),
        prisma.camera.count({ where: { enabled: true } }),
        prisma.user.count({ where: { role: { in: STAFF_ROLES }, active: true } }),
        prisma.user.count({ where: { role: "PARENT", active: true } }),
        cctvRepository.countLogsSince(since, ["VIEW_START"]),
        cctvRepository.countLogsSince(since, ["AUTHORIZE_DENIED"]),
      ]);
    return { students, cameras, camerasEnabled, staff, parents, viewsToday, deniedToday };
  },

  async recentCctvActivity(role: Role, limit = 100): Promise<CctvActivityRow[]> {
    requirePermission(role, PERMISSIONS.CCTV_AUDIT);
    const logs = await cctvRepository.recentLogs(limit);
    return logs.map((l) => ({
      id: l.id,
      createdAt: l.createdAt,
      action: l.action,
      reason: l.reason,
      userName: l.user?.name ?? "—",
      userRole: l.user?.role ?? "—",
      cameraName: l.camera?.name ?? "—",
    }));
  },
};
