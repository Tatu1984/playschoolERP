import type { Entity, ID, ISODate } from "./common.types";
import type { Role } from "../constants/roles";

// ---------------------------------------------------------------- notifications

export type NotificationChannel = "PUSH" | "EMAIL" | "SMS" | "WHATSAPP" | "IN_APP";

export type NotificationKind =
  | "ACTIVITY"
  | "ATTENDANCE"
  | "NOTICE"
  | "FEE"
  | "MESSAGE"
  | "EVENT"
  | "ACHIEVEMENT"
  | "EMERGENCY"
  | "SYSTEM";

export interface AppNotification extends Entity {
  userId: ID;
  kind: NotificationKind;
  title: string;
  body: string;
  href: string | null;
  read: boolean;
  emoji: string;
}

export interface NotificationPreference {
  userId: ID;
  channels: Record<NotificationChannel, boolean>;
  mutedKinds: NotificationKind[];
  quietHours: { from: string; to: string } | null;
}

export interface DeviceToken extends Entity {
  userId: ID;
  platform: "IOS" | "ANDROID" | "WEB";
  label: string;
  lastSeenAt: ISODate;
}

// ---------------------------------------------------------------- safety

export interface EmergencyContact extends Entity {
  studentId: ID;
  name: string;
  relation: string;
  phone: string;
  priority: number;
}

export interface SafetyBroadcast extends Entity {
  title: string;
  body: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  branchId: ID | null;
  sentByName: string;
  acknowledgedBy: ID[];
  /**
   * What happened when this was sent, as opposed to whether a row was written.
   * `finishedAt` null means delivery is still running or never ran, and the UI
   * must say "sending" rather than "sent" — those are different facts, and for
   * an emergency broadcast the difference is the entire point.
   *
   * `delivered` counts people whose phone or inbox was reached, not messages:
   * a parent with three handsets is one. `unreached` is the number who have it
   * in the portal and nowhere else — the list a school telephones.
   */
  delivery: {
    recipients: number;
    delivered: number;
    unreached: number;
    finishedAt: ISODate | null;
  };
}

export interface MedicalProfile {
  studentId: ID;
  bloodGroup: string;
  allergies: string[];
  conditions: string[];
  medications: string[];
  doctorName: string;
  doctorPhone: string;
  insuranceNo: string;
  notes: string;
}

// ---------------------------------------------------------------- admin ops

export interface AuditEntry extends Entity {
  actorName: string;
  actorRole: Role;
  action: string;
  target: string;
  detail: string;
  ip: string;
}

export interface RoleDefinition {
  role: Role;
  label: string;
  description: string;
  /** Permission keys from shared/constants/permissions. */
  permissions: string[];
  userCount: number;
  system: boolean;
}

export interface SchoolSettings {
  schoolName: string;
  tagline: string;
  supportEmail: string;
  supportPhone: string;
  whatsapp: string;
  address: string;
  academicYear: string;
  currency: string;
  timezone: string;
  locale: "en" | "hi" | "bn";
  /** Feature flags surfaced in /admin/settings. */
  features: {
    cctv: boolean;
    kidsZone: boolean;
    onlinePayments: boolean;
    messaging: boolean;
    admissionsOnline: boolean;
    seasonalTheme: boolean;
  };
  seasonalTheme: "none" | "diwali" | "christmas" | "summer" | "independence";
}

// ---------------------------------------------------------------- analytics

export interface SeriesPoint {
  label: string;
  value: number;
}

export interface AnalyticsSnapshot {
  attendanceTrend: SeriesPoint[];
  feeCollection: SeriesPoint[];
  engagement: SeriesPoint[];
  gameUsage: SeriesPoint[];
  learningProgress: SeriesPoint[];
  retention: SeriesPoint[];
}
