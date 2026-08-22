/** Notifications, safety, settings, roles and analytics demo data. */
import type {
  AnalyticsSnapshot,
  AppNotification,
  AuditEntry,
  DeviceToken,
  EmergencyContact,
  MedicalProfile,
  NotificationPreference,
  RoleDefinition,
  SafetyBroadcast,
  SchoolSettings,
} from "../types/ops.types";
import { ROLES } from "../constants/roles";
import { PERMISSIONS } from "../constants/permissions";
import { daysAgo, hoursAgo, minutesAgo } from "../utils/date.util";
import { STUDENTS } from "./school.fixture";

export const NOTIFICATIONS: AppNotification[] = [
  { id: "nt_1", userId: "usr_parent", kind: "ACTIVITY", title: "New photos from Sunshine", body: "Meera posted “Fingerprint butterflies 🦋” with 2 photos.", href: "/parent/feed", read: false, emoji: "📸", createdAt: hoursAgo(5) },
  { id: "nt_2", userId: "usr_parent", kind: "MESSAGE", title: "Meera Banerjee replied", body: "We'll try the shorter nap from tomorrow.", href: "/parent/messages", read: false, emoji: "💬", createdAt: hoursAgo(1) },
  { id: "nt_3", userId: "usr_parent", kind: "FEE", title: "Term 2 fee due in 9 days", body: "₹22,500 due on the 10th. Pay now to avoid late fees.", href: "/parent/payments", read: false, emoji: "💳", createdAt: daysAgo(1, 11, 5) },
  { id: "nt_4", userId: "usr_parent", kind: "ATTENDANCE", title: "Aarav checked in", body: "Checked in at 8:50 AM by Meera Banerjee.", href: "/parent/attendance", read: true, emoji: "✅", createdAt: minutesAgo(200) },
  { id: "nt_5", userId: "usr_parent", kind: "NOTICE", title: "Annual Day — 15 August", body: "Two seats per family. Costumes go home Friday.", href: "/parent/notices", read: true, emoji: "📢", createdAt: daysAgo(2, 10, 5) },
  { id: "nt_6", userId: "usr_parent", kind: "ACHIEVEMENT", title: "Aarav earned “Bookworm”", body: "He finished two stories in the Kids Zone.", href: "/kids/rewards", read: true, emoji: "🏅", createdAt: daysAgo(3, 18, 0) },
  { id: "nt_7", userId: "usr_parent", kind: "EVENT", title: "PTM slots are open", body: "Book your 15-minute slot for Term 2.", href: "/parent/events", read: true, emoji: "🗣️", createdAt: daysAgo(4, 9, 30) },
];

export const NOTIFICATION_PREFERENCE: NotificationPreference = {
  userId: "usr_parent",
  channels: { PUSH: true, EMAIL: true, SMS: false, WHATSAPP: true, IN_APP: true },
  mutedKinds: [],
  quietHours: { from: "21:30", to: "07:00" },
};

export const DEVICE_TOKENS: DeviceToken[] = [
  { id: "dv_1", userId: "usr_parent", platform: "ANDROID", label: "Pixel 8 · Climb Kiddo app", lastSeenAt: minutesAgo(12), createdAt: daysAgo(80) },
  { id: "dv_2", userId: "usr_parent", platform: "WEB", label: "Chrome · MacBook Air", lastSeenAt: minutesAgo(1), createdAt: daysAgo(14) },
];

export const EMERGENCY_CONTACTS: EmergencyContact[] = [
  { id: "ec_1", studentId: "stu_aarav", name: "Priya Sharma", relation: "Mother", phone: "+91 90700 00000", priority: 1, createdAt: daysAgo(300) },
  { id: "ec_2", studentId: "stu_aarav", name: "Rahul Sharma", relation: "Father", phone: "+91 90700 11111", priority: 2, createdAt: daysAgo(300) },
  { id: "ec_3", studentId: "stu_aarav", name: "Kamala Sharma", relation: "Grandmother", phone: "+91 90700 22222", priority: 3, createdAt: daysAgo(180) },
];

export const MEDICAL_PROFILES: MedicalProfile[] = STUDENTS.slice(0, 6).map((s) => ({
  studentId: s.id,
  bloodGroup: s.bloodGroup,
  allergies: s.allergies,
  conditions: s.allergies.length ? ["Mild eczema"] : [],
  medications: s.allergies.length ? ["Cetirizine syrup (as needed)"] : [],
  doctorName: "Dr. Anirban Sen",
  doctorPhone: "+91 98301 55555",
  insuranceNo: `INS/${s.admissionNo}`,
  notes: s.medicalNotes,
}));

export const SAFETY_BROADCASTS: SafetyBroadcast[] = [
  {
    id: "sb_1",
    title: "Heavy rain — pickup moved to the covered porch",
    body: "Please collect from the covered porch on the east side today. Cars can queue on Kathgola Road; staff will bring children out.",
    severity: "WARNING",
    branchId: "br_kathgola",
    sentByName: "School Admin",
    acknowledgedBy: ["usr_parent"],
    // Two parents have the app installed and one has no working device: the
    // demo store should show the same "reached / not reached" split the real
    // delivery record produces, not a flattering one.
    delivery: { recipients: 24, delivered: 23, unreached: 1, finishedAt: daysAgo(2, 13, 41) },
    createdAt: daysAgo(2, 13, 40),
  },
  {
    id: "sb_2",
    title: "Fire drill completed",
    body: "All 24 children and 10 staff evacuated in 2 min 40 s. No action needed from parents.",
    severity: "INFO",
    branchId: null,
    sentByName: "School Admin",
    acknowledgedBy: [],
    delivery: { recipients: 34, delivered: 34, unreached: 0, finishedAt: daysAgo(11, 11, 1) },
    createdAt: daysAgo(11, 11, 0),
  },
];

export const AUDIT_ENTRIES: AuditEntry[] = [
  { id: "au_1", actorName: "School Admin", actorRole: ROLES.ADMIN, action: "camera.toggle", target: "Toddler Room — Live", detail: "enabled → disabled (kill-switch)", ip: "103.21.44.10", createdAt: hoursAgo(4) },
  { id: "au_2", actorName: "Iqbal Hossain", actorRole: ROLES.ADMIN, action: "invoice.create", target: "CK/T2/1008", detail: "Term 2 invoice generated for Ira Chatterjee", ip: "103.21.44.11", createdAt: hoursAgo(9) },
  { id: "au_3", actorName: "School Admin", actorRole: ROLES.ADMIN, action: "role.assign", target: "tanvi@climbkiddo.in", detail: "TEACHER granted", ip: "103.21.44.10", createdAt: daysAgo(1, 12, 0) },
  { id: "au_4", actorName: "Meera Banerjee", actorRole: ROLES.TEACHER, action: "attendance.mark", target: "Sunshine · 4 students", detail: "3 present, 1 absent", ip: "103.21.44.19", createdAt: daysAgo(1, 9, 10) },
  { id: "au_5", actorName: "Iqbal Hossain", actorRole: ROLES.ADMIN, action: "student.export", target: "students.csv", detail: "24 rows exported", ip: "103.21.44.11", createdAt: daysAgo(2, 16, 30) },
  { id: "au_6", actorName: "School Admin", actorRole: ROLES.ADMIN, action: "settings.update", target: "school settings", detail: "seasonalTheme: none → summer", ip: "103.21.44.10", createdAt: daysAgo(3, 10, 0) },
  { id: "au_7", actorName: "Farhan Alam", actorRole: ROLES.TEACHER, action: "report.publish", target: "Term 2 · Aarohi Sen", detail: "progress report published to parent", ip: "103.21.44.22", createdAt: daysAgo(6, 15, 0) },
];

export const ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    role: ROLES.SUPER_ADMIN,
    label: "Super Admin",
    description: "Full system access across every branch, including roles, billing and CMS.",
    permissions: Object.values(PERMISSIONS),
    userCount: 1,
    system: true,
  },
  {
    role: ROLES.ADMIN,
    label: "Branch Admin",
    description: "Manages one branch: staff, students, fees, notices, events and CCTV config.",
    permissions: [PERMISSIONS.CCTV_MANAGE, PERMISSIONS.CCTV_AUDIT, PERMISSIONS.CCTV_VIEW, PERMISSIONS.STUDENT_MANAGE, PERMISSIONS.USER_MANAGE],
    userCount: 2,
    system: true,
  },
  {
    role: ROLES.TEACHER,
    label: "Teacher",
    description: "Class roster, attendance, activity uploads, lesson plans, messages and reports.",
    permissions: [PERMISSIONS.CCTV_VIEW],
    userCount: 7,
    system: true,
  },
  {
    role: ROLES.PARENT,
    label: "Parent",
    description: "Own child's data only: feed, attendance, notices, fees, messages, live camera.",
    permissions: [PERMISSIONS.CCTV_VIEW],
    userCount: 24,
    system: true,
  },
];

export const SCHOOL_SETTINGS: SchoolSettings = {
  schoolName: "Climb Kiddo",
  tagline: "Daycare · Playschool · Kids Activity Centre",
  supportEmail: "hello@climbkiddo.in",
  supportPhone: "+91 98300 11223",
  whatsapp: "+91 98300 11223",
  address: "12/A Kathgola Road, Beleghata, Kolkata 700010",
  academicYear: "2026-27",
  currency: "INR",
  timezone: "Asia/Kolkata",
  locale: "en",
  features: {
    cctv: true,
    kidsZone: true,
    onlinePayments: true,
    messaging: true,
    admissionsOnline: true,
    seasonalTheme: false,
  },
  seasonalTheme: "none",
};

const MONTHS = ["Feb", "Mar", "Apr", "May", "Jun", "Jul"];

export const ANALYTICS: AnalyticsSnapshot = {
  attendanceTrend: [
    { label: "Mon", value: 92 },
    { label: "Tue", value: 95 },
    { label: "Wed", value: 89 },
    { label: "Thu", value: 93 },
    { label: "Fri", value: 90 },
    { label: "Sat", value: 78 },
  ],
  feeCollection: MONTHS.map((m, i) => ({ label: m, value: [412000, 468000, 501000, 455000, 523000, 386000][i] })),
  engagement: MONTHS.map((m, i) => ({ label: m, value: [58, 64, 71, 76, 82, 79][i] })),
  gameUsage: [
    { label: "Balloon Pop", value: 218 },
    { label: "Memory Match", value: 176 },
    { label: "Shape Drop", value: 154 },
    { label: "Count Along", value: 131 },
    { label: "Letter Trace", value: 112 },
    { label: "Word Builder", value: 74 },
  ],
  learningProgress: [
    { label: "Cognitive", value: 78 },
    { label: "Language", value: 74 },
    { label: "Motor", value: 82 },
    { label: "Social", value: 80 },
    { label: "Emotional", value: 71 },
    { label: "Creative", value: 85 },
  ],
  retention: [
    { label: "2023-24", value: 88 },
    { label: "2024-25", value: 91 },
    { label: "2025-26", value: 94 },
    { label: "2026-27", value: 96 },
  ],
};
