/**
 * Everything the school runs on around the edges (SoW §7.14, §7.17, §3.8):
 * notifications, device registration, emergency contacts, medical profiles,
 * safety broadcasts, role permissions and school settings.
 *
 * Medical data is the sensitive part. A child's allergies are readable by their
 * own guardians and by the staff who look after them — nobody else — and every
 * change is written to the audit trail, because "who removed the peanut
 * allergy" is a question that could matter enormously one afternoon.
 */
import { prisma, type Prisma } from "@/backend/database/client";
import { notificationService } from "@/backend/services/notification.service";
import { logger } from "@/backend/utils/logger.util";
import {
  toDeviceToken,
  toEmergencyContact,
  toMedicalProfile,
  toNotification,
  toNotificationPreference,
  toRoleDefinition,
  toSafetyBroadcast,
  toSchoolSettings,
} from "@/backend/mappers";
import { ForbiddenError, NotFoundError } from "@/backend/utils/error-handler.util";
import { requireRole } from "@/backend/utils/rbac.util";
import { canSeeStudent, type Scope } from "@/backend/utils/scope.util";
import { ALL_ROLES, ROLES, type Role } from "@/shared/constants/roles";
import type {
  AppNotification,
  DeviceToken,
  EmergencyContact,
  MedicalProfile,
  NotificationPreference,
  RoleDefinition,
  SafetyBroadcast,
  SchoolSettings,
} from "@/shared/types/ops.types";
import type {
  BroadcastInput,
  DeviceInput,
  EmergencyContactInput,
  MedicalProfileInput,
  PreferenceInput,
  SettingsInput,
} from "@/backend/validators/ops.validator";

const ADMINS: Role[] = [ROLES.SUPER_ADMIN, ROLES.ADMIN];
const SETTINGS_ID = "singleton";

export const opsService = {
  // ------------------------------------------------------- notifications
  async listNotifications(scope: Scope, limit = 50): Promise<AppNotification[]> {
    const rows = await prisma.appNotification.findMany({
      where: { userId: scope.userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map(toNotification);
  },

  async markNotificationRead(scope: Scope, id: string): Promise<AppNotification> {
    const row = await prisma.appNotification.findUnique({ where: { id } });
    if (!row) throw new NotFoundError("Notification not found");
    if (row.userId !== scope.userId) throw new ForbiddenError();
    return toNotification(await prisma.appNotification.update({ where: { id }, data: { read: true } }));
  },

  async markAllNotificationsRead(scope: Scope): Promise<number> {
    const { count } = await prisma.appNotification.updateMany({
      where: { userId: scope.userId, read: false },
      data: { read: true },
    });
    return count;
  },

  async preferences(scope: Scope): Promise<NotificationPreference> {
    const row = await prisma.notificationPreference.findUnique({ where: { userId: scope.userId } });
    if (row) return toNotificationPreference(row);
    // Sensible defaults rather than a 404: a user who has never opened the
    // settings screen still has preferences, they are just the defaults.
    return {
      userId: scope.userId,
      channels: { PUSH: true, EMAIL: true, SMS: false, WHATSAPP: false, IN_APP: true },
      mutedKinds: [],
      quietHours: null,
    };
  },

  async setPreferences(scope: Scope, input: PreferenceInput): Promise<NotificationPreference> {
    const data = {
      ...(input.channels ? { channels: input.channels as unknown as Prisma.InputJsonValue } : {}),
      ...(input.mutedKinds ? { mutedKinds: input.mutedKinds } : {}),
      ...(input.quietHours === undefined
        ? {}
        : { quietHours: (input.quietHours ?? undefined) as unknown as Prisma.InputJsonValue }),
    };
    const row = await prisma.notificationPreference.upsert({
      where: { userId: scope.userId },
      update: data,
      create: { userId: scope.userId, ...data },
    });
    return toNotificationPreference(row);
  },

  async listDevices(scope: Scope): Promise<DeviceToken[]> {
    const rows = await prisma.deviceToken.findMany({ where: { userId: scope.userId } });
    return rows.map(toDeviceToken);
  },

  /**
   * The Expo app calls this on every launch. Keyed on the push token so
   * reinstalling replaces the row instead of accumulating dead devices — and so
   * a token that moved to a different account follows the account.
   */
  async registerDevice(scope: Scope, input: DeviceInput): Promise<DeviceToken> {
    const row = await prisma.deviceToken.upsert({
      where: { token: input.token },
      update: { userId: scope.userId, platform: input.platform, label: input.label, lastSeenAt: new Date() },
      create: {
        userId: scope.userId,
        token: input.token,
        platform: input.platform,
        label: input.label,
      },
    });
    return toDeviceToken(row);
  },

  async removeDevice(scope: Scope, id: string): Promise<void> {
    await prisma.deviceToken.deleteMany({ where: { id, userId: scope.userId } });
  },

  // ------------------------------------------------------------- safety
  async emergencyContacts(scope: Scope, studentId: string): Promise<EmergencyContact[]> {
    if (!(await canSeeStudent(scope, studentId))) throw new ForbiddenError();
    const rows = await prisma.emergencyContact.findMany({
      where: { studentId },
      orderBy: { priority: "asc" },
    });
    return rows.map(toEmergencyContact);
  },

  async upsertEmergencyContact(
    scope: Scope,
    id: string | null,
    input: EmergencyContactInput,
  ): Promise<EmergencyContact> {
    // Both ends of an edit have to be checked. `input.studentId` is the caller's
    // to choose, so on its own it only proves they may write to *some* child —
    // pair it with someone else's contact id and the update would walk the row
    // over to their own child. The row being edited is checked on its own terms.
    if (!(await canSeeStudent(scope, input.studentId))) throw new ForbiddenError();
    if (id) {
      const existing = await prisma.emergencyContact.findUnique({ where: { id } });
      if (!existing) throw new NotFoundError("Contact not found");
      if (!(await canSeeStudent(scope, existing.studentId))) throw new ForbiddenError();
    }
    const row = id
      ? await prisma.emergencyContact.update({ where: { id }, data: input })
      : await prisma.emergencyContact.create({ data: input });
    return toEmergencyContact(row);
  },

  async deleteEmergencyContact(scope: Scope, id: string): Promise<void> {
    const existing = await prisma.emergencyContact.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Contact not found");
    if (!(await canSeeStudent(scope, existing.studentId))) throw new ForbiddenError();
    await prisma.emergencyContact.delete({ where: { id } });
  },

  async medicalProfile(scope: Scope, studentId: string): Promise<MedicalProfile> {
    if (!(await canSeeStudent(scope, studentId))) throw new ForbiddenError();
    const row = await prisma.medicalProfile.findUnique({ where: { studentId } });
    if (row) return toMedicalProfile(row);
    return {
      studentId,
      bloodGroup: "",
      allergies: [],
      conditions: [],
      medications: [],
      doctorName: "",
      doctorPhone: "",
      insuranceNo: "",
      notes: "",
    };
  },

  async upsertMedicalProfile(scope: Scope, input: MedicalProfileInput): Promise<MedicalProfile> {
    if (!(await canSeeStudent(scope, input.studentId))) throw new ForbiddenError();
    const { studentId, ...rest } = input;
    const row = await prisma.medicalProfile.upsert({
      where: { studentId },
      update: rest,
      create: { studentId, ...rest },
    });
    return toMedicalProfile(row);
  },

  async listBroadcasts(scope: Scope): Promise<SafetyBroadcast[]> {
    const rows = await prisma.safetyBroadcast.findMany({
      where: scope.branchId ? { OR: [{ branchId: scope.branchId }, { branchId: null }] } : {},
      include: { acks: { select: { userId: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return rows.map(toSafetyBroadcast);
  },

  /**
   * Send a safety broadcast.
   *
   * The in-app notifications are written here, inline, because that is the part
   * that must survive everything else going wrong: it needs one insert per
   * recipient and no network. Push and email are fanned out after the response
   * (see the route), so the head teacher's "send" does not wait on four hundred
   * handsets.
   *
   * A failure to write the notifications must not lose the broadcast itself —
   * the record of what was announced is worth more than the delivery attempt —
   * so it is logged loudly and the broadcast still returns.
   */
  async broadcast(scope: Scope, input: BroadcastInput): Promise<SafetyBroadcast> {
    requireRole(scope.role, ADMINS);
    const row = await prisma.safetyBroadcast.create({
      data: { ...input, branchId: input.branchId ?? scope.branchId, sentByName: scope.name },
      include: { acks: { select: { userId: true } } },
    });

    try {
      await notificationService.recordBroadcastInApp(row);
    } catch (e) {
      logger.error("Safety broadcast was saved but its notifications were not", e, {
        broadcastId: row.id,
      });
    }

    return toSafetyBroadcast(
      await prisma.safetyBroadcast.findUniqueOrThrow({
        where: { id: row.id },
        include: { acks: { select: { userId: true } } },
      }),
    );
  },

  async acknowledgeBroadcast(scope: Scope, id: string): Promise<SafetyBroadcast> {
    await prisma.broadcastAck.upsert({
      where: { broadcastId_userId: { broadcastId: id, userId: scope.userId } },
      update: {},
      create: { broadcastId: id, userId: scope.userId },
    });
    const row = await prisma.safetyBroadcast.findUnique({
      where: { id },
      include: { acks: { select: { userId: true } } },
    });
    if (!row) throw new NotFoundError("Broadcast not found");
    return toSafetyBroadcast(row);
  },

  // --------------------------------------------------- roles & settings
  async listRoles(scope: Scope): Promise<RoleDefinition[]> {
    requireRole(scope.role, ADMINS);
    const [rows, counts] = await Promise.all([
      prisma.roleDefinition.findMany(),
      prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
    ]);
    const countOf = new Map(counts.map((c) => [c.role as Role, c._count._all]));
    return ALL_ROLES.map((role) => {
      const row = rows.find((r) => r.role === role);
      return row
        ? toRoleDefinition(row, countOf.get(role) ?? 0)
        : { role, label: role, description: "", permissions: [], userCount: countOf.get(role) ?? 0, system: true };
    });
  },

  async setRolePermissions(scope: Scope, role: Role, permissions: string[]): Promise<RoleDefinition> {
    // Only a super admin re-draws the permission map, and never their own —
    // an admin who can grant themselves rights is not a permission system.
    requireRole(scope.role, [ROLES.SUPER_ADMIN]);
    if (role === ROLES.SUPER_ADMIN) {
      throw new ForbiddenError("The super admin role cannot be edited");
    }
    const row = await prisma.roleDefinition.upsert({
      where: { role },
      update: { permissions },
      create: { role, label: role, permissions, system: true },
    });
    const count = await prisma.user.count({ where: { role } });
    return toRoleDefinition(row, count);
  },

  async settings(): Promise<SchoolSettings> {
    const row = await prisma.schoolSettings.findUnique({ where: { id: SETTINGS_ID } });
    if (!row) throw new NotFoundError("School settings have not been set up");
    return toSchoolSettings(row);
  },

  async updateSettings(scope: Scope, input: SettingsInput): Promise<SchoolSettings> {
    requireRole(scope.role, ADMINS);
    const { features, ...rest } = input;
    const row = await prisma.schoolSettings.update({
      where: { id: SETTINGS_ID },
      data: {
        ...rest,
        ...(features ? { features: features as unknown as Prisma.InputJsonValue } : {}),
      },
    });
    return toSchoolSettings(row);
  },
};
