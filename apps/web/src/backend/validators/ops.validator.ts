import { z } from "zod";

const channel = z.enum(["PUSH", "EMAIL", "SMS", "WHATSAPP", "IN_APP"]);
const kind = z.enum([
  "ACTIVITY", "ATTENDANCE", "NOTICE", "FEE", "MESSAGE",
  "EVENT", "ACHIEVEMENT", "EMERGENCY", "SYSTEM",
]);
const timeOfDay = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export const preferenceSchema = z.object({
  channels: z.record(channel, z.boolean()).optional(),
  mutedKinds: z.array(kind).optional(),
  quietHours: z.object({ from: timeOfDay, to: timeOfDay }).nullable().optional(),
});

export const deviceSchema = z.object({
  token: z.string().min(8),
  platform: z.enum(["IOS", "ANDROID", "WEB"]).default("WEB"),
  label: z.string().default(""),
});

export const emergencyContactSchema = z.object({
  studentId: z.string().min(1),
  name: z.string().min(2),
  relation: z.string().default(""),
  phone: z.string().min(6),
  priority: z.number().int().min(1).max(10).default(1),
});

export const medicalProfileSchema = z.object({
  studentId: z.string().min(1),
  bloodGroup: z.string().default(""),
  allergies: z.array(z.string()).default([]),
  conditions: z.array(z.string()).default([]),
  medications: z.array(z.string()).default([]),
  doctorName: z.string().default(""),
  doctorPhone: z.string().default(""),
  insuranceNo: z.string().default(""),
  notes: z.string().default(""),
});

export const broadcastSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  severity: z.enum(["INFO", "WARNING", "CRITICAL"]).default("INFO"),
  branchId: z.string().nullable().optional(),
});

export const rolePermissionsSchema = z.object({
  role: z.enum(["ADMIN", "TEACHER", "PARENT"]),
  permissions: z.array(z.string()),
});

export const settingsSchema = z.object({
  schoolName: z.string().min(1).optional(),
  tagline: z.string().optional(),
  supportEmail: z.email().or(z.literal("")).optional(),
  supportPhone: z.string().optional(),
  whatsapp: z.string().optional(),
  address: z.string().optional(),
  academicYear: z.string().optional(),
  currency: z.string().optional(),
  timezone: z.string().optional(),
  locale: z.enum(["en", "hi", "bn"]).optional(),
  features: z
    .object({
      cctv: z.boolean(),
      kidsZone: z.boolean(),
      onlinePayments: z.boolean(),
      messaging: z.boolean(),
      admissionsOnline: z.boolean(),
      seasonalTheme: z.boolean(),
    })
    .partial()
    .optional(),
  seasonalTheme: z.enum(["none", "diwali", "christmas", "summer", "independence"]).optional(),
});

export type PreferenceInput = z.infer<typeof preferenceSchema>;
export type DeviceInput = z.infer<typeof deviceSchema>;
export type EmergencyContactInput = z.infer<typeof emergencyContactSchema>;
export type MedicalProfileInput = z.infer<typeof medicalProfileSchema>;
export type BroadcastInput = z.infer<typeof broadcastSchema>;
export type SettingsInput = z.infer<typeof settingsSchema>;
