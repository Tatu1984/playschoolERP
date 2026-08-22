import type {
  AppNotification,
  AuditEntry,
  DeviceToken,
  EmergencyContact,
  MedicalProfile,
  NotificationChannel,
  NotificationKind,
  NotificationPreference,
  RoleDefinition,
  SafetyBroadcast,
  SchoolSettings,
} from "@/shared/types/ops.types";
import type { Role } from "@/shared/constants/roles";
import type * as P from "@/backend/database/generated";
import { asJson, iso } from "./index";

export function toNotification(n: P.AppNotification): AppNotification {
  return {
    id: n.id,
    userId: n.userId,
    kind: n.kind,
    title: n.title,
    body: n.body,
    href: n.href,
    read: n.read,
    emoji: n.emoji,
    createdAt: iso(n.createdAt),
  };
}

const ALL_CHANNELS_ON: Record<NotificationChannel, boolean> = {
  PUSH: true,
  EMAIL: true,
  SMS: false,
  WHATSAPP: false,
  IN_APP: true,
};

export function toNotificationPreference(p: P.NotificationPreference): NotificationPreference {
  return {
    userId: p.userId,
    channels: asJson<Record<NotificationChannel, boolean>>(p.channels, ALL_CHANNELS_ON),
    mutedKinds: p.mutedKinds as NotificationKind[],
    quietHours: asJson<NotificationPreference["quietHours"]>(p.quietHours, null),
  };
}

export function toDeviceToken(t: P.DeviceToken): DeviceToken {
  return {
    id: t.id,
    userId: t.userId,
    platform: t.platform,
    label: t.label,
    lastSeenAt: iso(t.lastSeenAt),
    createdAt: iso(t.createdAt),
  };
}

export function toEmergencyContact(c: P.EmergencyContact): EmergencyContact {
  return {
    id: c.id,
    studentId: c.studentId,
    name: c.name,
    relation: c.relation,
    phone: c.phone,
    priority: c.priority,
    createdAt: iso(c.createdAt),
    updatedAt: iso(c.updatedAt),
  };
}

export function toMedicalProfile(m: P.MedicalProfile): MedicalProfile {
  return {
    studentId: m.studentId,
    bloodGroup: m.bloodGroup,
    allergies: m.allergies,
    conditions: m.conditions,
    medications: m.medications,
    doctorName: m.doctorName,
    doctorPhone: m.doctorPhone,
    insuranceNo: m.insuranceNo,
    notes: m.notes,
  };
}

type BroadcastRow = P.SafetyBroadcast & { acks?: { userId: string }[] };

export function toSafetyBroadcast(b: BroadcastRow): SafetyBroadcast {
  return {
    id: b.id,
    title: b.title,
    body: b.body,
    severity: b.severity,
    branchId: b.branchId,
    sentByName: b.sentByName,
    acknowledgedBy: (b.acks ?? []).map((a) => a.userId),
    delivery: {
      recipients: b.recipientCount,
      delivered: b.deliveredCount,
      unreached: b.failedCount,
      finishedAt: b.deliveryFinishedAt ? iso(b.deliveryFinishedAt) : null,
    },
    createdAt: iso(b.createdAt),
  };
}

export function toAuditEntry(a: P.AuditEntry): AuditEntry {
  return {
    id: a.id,
    actorName: a.actorName,
    actorRole: a.actorRole as Role,
    action: a.action,
    target: a.target,
    detail: a.detail,
    ip: a.ip,
    createdAt: iso(a.createdAt),
  };
}

export function toRoleDefinition(r: P.RoleDefinition, userCount: number): RoleDefinition {
  return {
    role: r.role as Role,
    label: r.label,
    description: r.description,
    permissions: r.permissions,
    userCount,
    system: r.system,
  };
}

export function toSchoolSettings(s: P.SchoolSettings): SchoolSettings {
  return {
    schoolName: s.schoolName,
    tagline: s.tagline,
    supportEmail: s.supportEmail,
    supportPhone: s.supportPhone,
    whatsapp: s.whatsapp,
    address: s.address,
    academicYear: s.academicYear,
    currency: s.currency,
    timezone: s.timezone,
    locale: s.locale as SchoolSettings["locale"],
    features: asJson<SchoolSettings["features"]>(s.features, {
      cctv: true,
      kidsZone: true,
      onlinePayments: true,
      messaging: true,
      admissionsOnline: true,
      seasonalTheme: false,
    }),
    seasonalTheme: s.seasonalTheme as SchoolSettings["seasonalTheme"],
  };
}
