import { prisma } from "@/backend/database/client";
import type { CctvLogAction } from "@/backend/database/client";

export const cctvRepository = {
  createCamera(data: {
    name: string;
    branchId: string;
    classroomId?: string | null;
    streamPath: string;
    rtspUrl: string;
    parentViewable: boolean;
  }) {
    return prisma.camera.create({ data });
  },

  listCameras(branchId?: string) {
    return prisma.camera.findMany({
      where: branchId ? { branchId } : undefined,
      include: { branch: true, classroom: true },
      orderBy: { createdAt: "desc" },
    });
  },

  findCameraById(id: string) {
    return prisma.camera.findUnique({
      where: { id },
      include: { branch: true, classroom: true },
    });
  },

  findCameraByStreamPath(streamPath: string) {
    return prisma.camera.findUnique({ where: { streamPath } });
  },

  setEnabled(id: string, enabled: boolean) {
    return prisma.camera.update({ where: { id }, data: { enabled } });
  },

  /** Classroom + branch ids for all of this parent's children. */
  async guardedClassroomIds(userId: string): Promise<{
    classroomIds: string[];
    branchIds: string[];
  }> {
    const rows = await prisma.guardianship.findMany({
      where: { userId },
      select: { student: { select: { classroomId: true, branchId: true } } },
    });
    const classroomIds = new Set<string>();
    const branchIds = new Set<string>();
    for (const r of rows) {
      if (r.student.classroomId) classroomIds.add(r.student.classroomId);
      branchIds.add(r.student.branchId);
    }
    return { classroomIds: [...classroomIds], branchIds: [...branchIds] };
  },

  /** Explicit per-user grants/revocations, keyed by cameraId. */
  async grantsForUser(userId: string): Promise<Map<string, boolean>> {
    const rows = await prisma.cameraAccessGrant.findMany({ where: { userId } });
    return new Map(rows.map((g) => [g.cameraId, g.allow]));
  },

  camerasForClassrooms(classroomIds: string[]) {
    return prisma.camera.findMany({
      where: {
        enabled: true,
        parentViewable: true,
        classroomId: { in: classroomIds },
      },
      include: { branch: true, classroom: true },
      orderBy: { name: "asc" },
    });
  },

  schoolHoursFor(branchId: string) {
    return prisma.schoolHours.findMany({ where: { branchId } });
  },

  log(entry: {
    userId: string;
    cameraId: string;
    action: CctvLogAction;
    reason?: string;
    ip?: string;
    userAgent?: string;
  }) {
    return prisma.cctvViewLog.create({ data: entry });
  },

  recentLogs(limit = 100) {
    return prisma.cctvViewLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        user: { select: { name: true, email: true, role: true } },
        camera: { select: { name: true, streamPath: true } },
      },
    });
  },

  countLogsSince(since: Date, actions?: CctvLogAction[]) {
    return prisma.cctvViewLog.count({
      where: {
        createdAt: { gte: since },
        ...(actions ? { action: { in: actions } } : {}),
      },
    });
  },
};
