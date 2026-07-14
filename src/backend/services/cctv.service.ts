import { cctvRepository } from "@/backend/repositories/cctv.repository";
import { signViewToken, verifyViewToken } from "@/backend/utils/jwt.util";
import {
  AppError,
  ForbiddenError,
  NotFoundError,
} from "@/backend/utils/error-handler.util";
import { requirePermission, isStaff } from "@/backend/utils/rbac.util";
import { PERMISSIONS } from "@/shared/constants/permissions";
import type { Role } from "@/shared/constants/roles";
import type { CreateCameraInput } from "@/backend/validators/cctv.validator";
import type {
  AccessDecision,
  ParentCameraDTO,
  ViewTokenResponse,
} from "@/shared/types/cctv.types";
import { env } from "@/config/env";

const VIEW_TOKEN_TTL = 60; // seconds

// ---- School-hours evaluation ----------------------------------------------

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

/** Current {dayOfWeek 0-6, minutesFromMidnight} in a given IANA timezone. */
function nowInZone(timezone: string): { dow: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  let dow = 0;
  let hour = 0;
  let minute = 0;
  for (const p of parts) {
    if (p.type === "weekday") dow = WEEKDAY_INDEX[p.value] ?? 0;
    else if (p.type === "hour") hour = parseInt(p.value, 10) % 24;
    else if (p.type === "minute") minute = parseInt(p.value, 10);
  }
  return { dow, minutes: hour * 60 + minute };
}

async function isWithinSchoolHours(
  branchId: string,
  timezone: string,
): Promise<boolean> {
  const hours = await cctvRepository.schoolHoursFor(branchId);
  if (hours.length === 0) return false; // no window configured => closed
  const { dow, minutes } = nowInZone(timezone);
  return hours.some(
    (h) => h.dayOfWeek === dow && minutes >= h.openMin && minutes < h.closeMin,
  );
}

// ---- Access decision (shared by list + token issuance) --------------------

type CameraWithRels = {
  id: string;
  enabled: boolean;
  parentViewable: boolean;
  classroomId: string | null;
  branchId: string;
  streamPath: string;
  branch: { timezone: string };
};

async function decideAccess(
  userId: string,
  role: Role,
  camera: CameraWithRels,
): Promise<AccessDecision> {
  if (!camera.enabled) {
    return { allowed: false, reason: "camera_disabled" };
  }

  // Staff with manage permission can always view (support/monitoring).
  if (isStaff(role)) {
    const withinHours = await isWithinSchoolHours(
      camera.branchId,
      camera.branch.timezone,
    );
    return withinHours || role === "SUPER_ADMIN"
      ? { allowed: true, reason: "staff" }
      : { allowed: false, reason: "outside_school_hours" };
  }

  if (!camera.parentViewable) {
    return { allowed: false, reason: "not_parent_viewable" };
  }

  // Explicit per-user grant/revocation wins over classroom derivation.
  const grants = await cctvRepository.grantsForUser(userId);
  if (grants.get(camera.id) === false) {
    return { allowed: false, reason: "access_revoked" };
  }

  const hasExplicitAllow = grants.get(camera.id) === true;
  if (!hasExplicitAllow) {
    // Derive from guardianship -> child's classroom.
    const { classroomIds } = await cctvRepository.guardedClassroomIds(userId);
    if (!camera.classroomId || !classroomIds.includes(camera.classroomId)) {
      return { allowed: false, reason: "not_your_childs_classroom" };
    }
  }

  const withinHours = await isWithinSchoolHours(
    camera.branchId,
    camera.branch.timezone,
  );
  if (!withinHours) {
    return { allowed: false, reason: "outside_school_hours" };
  }

  return { allowed: true, reason: "ok" };
}

// ---- Public service API ----------------------------------------------------

export const cctvService = {
  /** Cameras a parent may see, each annotated with whether it's live now. */
  async listForParent(userId: string): Promise<ParentCameraDTO[]> {
    const { classroomIds } = await cctvRepository.guardedClassroomIds(userId);
    const grants = await cctvRepository.grantsForUser(userId);
    const explicitAllowIds = [...grants.entries()]
      .filter(([, allow]) => allow)
      .map(([id]) => id);

    const byClassroom =
      classroomIds.length > 0
        ? await cctvRepository.camerasForClassrooms(classroomIds)
        : [];

    // Merge classroom-derived + explicitly-granted cameras, drop revoked.
    const map = new Map<string, (typeof byClassroom)[number]>();
    for (const c of byClassroom) map.set(c.id, c);
    for (const id of explicitAllowIds) {
      if (!map.has(id)) {
        const cam = await cctvRepository.findCameraById(id);
        if (cam && cam.enabled) map.set(cam.id, cam);
      }
    }

    const cameras = [...map.values()].filter(
      (c) => grants.get(c.id) !== false,
    );

    const result: ParentCameraDTO[] = [];
    for (const c of cameras) {
      const liveNow = await isWithinSchoolHours(c.branchId, c.branch.timezone);
      result.push({
        id: c.id,
        name: c.name,
        classroomName: c.classroom?.name ?? null,
        branchName: c.branch.name,
        streamPath: c.streamPath,
        liveNow,
      });
    }
    return result;
  },

  /**
   * Authorize a specific parent/staff to view a camera *right now* and, if
   * allowed, mint a short-lived single-camera view token. Every decision is
   * written to the audit log.
   */
  async issueViewToken(
    userId: string,
    role: Role,
    cameraId: string,
    ctx: { ip?: string; userAgent?: string },
  ): Promise<ViewTokenResponse> {
    const camera = await cctvRepository.findCameraById(cameraId);
    if (!camera) throw new NotFoundError("Camera not found");

    const decision = await decideAccess(userId, role, camera);

    await cctvRepository.log({
      userId,
      cameraId,
      action: decision.allowed ? "AUTHORIZE_GRANTED" : "AUTHORIZE_DENIED",
      reason: decision.reason,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });

    if (!decision.allowed) {
      throw new ForbiddenError(reasonMessage(decision.reason));
    }

    const token = await signViewToken(
      { sub: userId, cameraId, streamPath: camera.streamPath },
      VIEW_TOKEN_TTL,
    );
    await cctvRepository.log({
      userId,
      cameraId,
      action: "TOKEN_ISSUED",
      ip: ctx.ip,
    });

    return {
      token,
      streamPath: camera.streamPath,
      whepUrl: `${env.MEDIAMTX_WHEP_URL}/${camera.streamPath}/whep`,
      expiresInSeconds: VIEW_TOKEN_TTL,
    };
  },

  /**
   * Called by the MediaMTX auth hook for every read/publish. Returns true to
   * permit. This is the last line of defense — it re-validates independently
   * of the token issuance above.
   */
  async authorizeMediaAccess(input: {
    action: string;
    path: string;
    token?: string;
    user?: string;
    password?: string;
    ip?: string;
  }): Promise<boolean> {
    // Publisher (trusted ingest / ffmpeg test stream) — internal creds.
    if (input.action === "publish") {
      return (
        input.user === env.CCTV_PUBLISHER_USER &&
        !!input.password &&
        input.password === env.CCTV_INTERNAL_SECRET
      );
    }

    if (input.action !== "read") {
      // playback/api/metrics/pprof — not exposed to parents.
      return false;
    }

    const claims = await verifyViewToken(input.token ?? input.password);
    if (!claims) return false;
    if (claims.streamPath !== input.path) return false;

    const camera = await cctvRepository.findCameraByStreamPath(input.path);
    if (!camera || !camera.enabled) return false;
    if (camera.id !== claims.cameraId) return false;

    await cctvRepository.log({
      userId: claims.sub,
      cameraId: camera.id,
      action: "VIEW_START",
      ip: input.ip,
    });
    return true;
  },

  // ---- Admin ----
  async createCamera(role: Role, input: CreateCameraInput) {
    requirePermission(role, PERMISSIONS.CCTV_MANAGE);
    const existing = await cctvRepository.findCameraByStreamPath(input.streamPath);
    if (existing) {
      throw new AppError("A camera with this stream path already exists", 409, "duplicate_path");
    }
    return cctvRepository.createCamera({
      name: input.name,
      branchId: input.branchId,
      classroomId: input.classroomId ?? null,
      streamPath: input.streamPath,
      rtspUrl: input.rtspUrl,
      parentViewable: input.parentViewable,
    });
  },

  async listCameras(role: Role, branchId?: string) {
    requirePermission(role, PERMISSIONS.CCTV_MANAGE);
    return cctvRepository.listCameras(branchId);
  },

  async setEnabled(role: Role, cameraId: string, enabled: boolean) {
    requirePermission(role, PERMISSIONS.CCTV_MANAGE);
    return cctvRepository.setEnabled(cameraId, enabled);
  },
};

function reasonMessage(reason: string): string {
  switch (reason) {
    case "camera_disabled":
      return "This camera is currently turned off by the school.";
    case "outside_school_hours":
      return "Live viewing is only available during school hours.";
    case "not_your_childs_classroom":
      return "You can only view cameras for your child's classroom.";
    case "not_parent_viewable":
      return "This camera is not available to parents.";
    case "access_revoked":
      return "Your access to this camera has been removed.";
    default:
      return "You do not have access to this camera.";
  }
}
