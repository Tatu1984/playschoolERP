/**
 * Pure derivations over store collections.
 *
 * Components select *raw* arrays from the store (stable references) and pipe
 * them through these helpers during render — that keeps zustand snapshots
 * referentially stable and makes every derivation unit-testable without React.
 */
import type {
  Activity,
  Conversation,
  Inquiry,
  Invoice,
  Message,
  Notice,
  SchoolEvent,
} from "@/shared/types/engagement.types";
import type {
  AttendanceRecord,
  Classroom,
  Guardian,
  Staff,
  Student,
} from "@/shared/types/school.types";
import type { Milestone, ProgressReport, SkillKey } from "@/shared/types/learning.types";
import type { SeriesPoint } from "@/shared/types/ops.types";
import { dateKey, today, weekKeys } from "@/shared/utils/date.util";

// ---------------------------------------------------------------- people

export function studentName(s: Student): string {
  return `${s.firstName} ${s.lastName}`;
}

export function childrenOfGuardian(students: Student[], guardians: Guardian[], guardianId: string): Student[] {
  const guardian = guardians.find((g) => g.id === guardianId);
  if (!guardian) return [];
  return students.filter((s) => guardian.studentIds.includes(s.id));
}

export function classroomsOfStaff(classrooms: Classroom[], staff: Staff[], staffId: string): Classroom[] {
  const member = staff.find((s) => s.id === staffId);
  const owned = classrooms.filter((c) => c.teacherId === staffId);
  const assigned = classrooms.filter((c) => member?.classroomIds.includes(c.id));
  const all = [...owned, ...assigned];
  return all.filter((c, i) => all.findIndex((x) => x.id === c.id) === i);
}

export function rosterOf(students: Student[], classroomId: string): Student[] {
  return students.filter((s) => s.classroomId === classroomId);
}

// ---------------------------------------------------------------- attendance

export function attendanceFor(
  attendance: AttendanceRecord[],
  studentId: string,
  date = dateKey(today()),
): AttendanceRecord | undefined {
  return attendance.find((a) => a.studentId === studentId && a.date === date);
}

export function attendanceOnDate(attendance: AttendanceRecord[], date: string): AttendanceRecord[] {
  return attendance.filter((a) => a.date === date);
}

export function attendanceRate(attendance: AttendanceRecord[], studentId: string): number {
  const rows = attendance.filter((a) => a.studentId === studentId && a.status !== "UNMARKED");
  if (!rows.length) return 0;
  const present = rows.filter((a) => a.status === "PRESENT" || a.status === "LATE" || a.status === "HALF_DAY").length;
  return Math.round((present / rows.length) * 100);
}

export function presentTodayCount(attendance: AttendanceRecord[], classroomId?: string): number {
  const key = dateKey(today());
  return attendance.filter(
    (a) =>
      a.date === key &&
      (a.status === "PRESENT" || a.status === "LATE") &&
      (!classroomId || a.classroomId === classroomId),
  ).length;
}

export function weeklyAttendanceSeries(attendance: AttendanceRecord[], studentId?: string): SeriesPoint[] {
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return weekKeys().map((key, i) => {
    const rows = attendance.filter((a) => a.date === key && (!studentId || a.studentId === studentId));
    const marked = rows.filter((a) => a.status !== "UNMARKED");
    const present = marked.filter((a) => a.status === "PRESENT" || a.status === "LATE").length;
    return { label: labels[i], value: marked.length ? Math.round((present / marked.length) * 100) : 0 };
  });
}

// ---------------------------------------------------------------- feed

export function feedForStudents(activities: Activity[], studentIds: string[]): Activity[] {
  return activities
    .filter((a) => a.published && a.studentIds.some((id) => studentIds.includes(id)))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function feedForClassrooms(activities: Activity[], classroomIds: string[]): Activity[] {
  return activities
    .filter((a) => classroomIds.includes(a.classroomId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// ---------------------------------------------------------------- notices

export function noticesFor(
  notices: Notice[],
  audience: "PARENTS" | "STAFF",
  classroomIds: string[],
): Notice[] {
  return notices
    .filter((n) => n.publishedAt !== null)
    .filter(
      (n) =>
        n.audience === "ALL" ||
        n.audience === audience ||
        (n.audience === "CLASSROOM" && n.classroomId !== null && classroomIds.includes(n.classroomId)),
    )
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "");
    });
}

export function unreadNoticeCount(notices: Notice[], userId: string, audience: "PARENTS" | "STAFF", classroomIds: string[]): number {
  return noticesFor(notices, audience, classroomIds).filter((n) => !n.readBy.includes(userId)).length;
}

// ---------------------------------------------------------------- messaging

export function conversationsFor(conversations: Conversation[], participantId: string): Conversation[] {
  return conversations
    .filter((c) => c.participantIds.includes(participantId))
    .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
}

export function messagesOf(messages: Message[], conversationId: string): Message[] {
  return messages
    .filter((m) => m.conversationId === conversationId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

// ---------------------------------------------------------------- fees

export function invoicesFor(invoices: Invoice[], studentIds: string[]): Invoice[] {
  return invoices
    .filter((i) => studentIds.includes(i.studentId))
    .sort((a, b) => b.issuedOn.localeCompare(a.issuedOn));
}

export function outstandingOf(invoices: Invoice[]): number {
  return invoices.reduce((sum, i) => sum + Math.max(0, i.amount + i.lateFee - i.paidAmount), 0);
}

export function collectedOf(invoices: Invoice[]): number {
  return invoices.reduce((sum, i) => sum + i.paidAmount, 0);
}

export function overdueCount(invoices: Invoice[]): number {
  return invoices.filter((i) => i.status === "OVERDUE").length;
}

// ---------------------------------------------------------------- events

export function upcomingEvents(events: SchoolEvent[], limit?: number): SchoolEvent[] {
  const nowIsoStr = new Date().toISOString();
  const rows = events
    .filter((e) => e.published && e.startsAt >= nowIsoStr)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  return limit ? rows.slice(0, limit) : rows;
}

export function pastEvents(events: SchoolEvent[]): SchoolEvent[] {
  const nowIsoStr = new Date().toISOString();
  return events
    .filter((e) => e.published && e.startsAt < nowIsoStr)
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt));
}

// ---------------------------------------------------------------- admissions

export const INQUIRY_STAGES: Inquiry["stage"][] = [
  "NEW",
  "CONTACTED",
  "VISIT_SCHEDULED",
  "APPLICATION",
  "ENROLLED",
  "LOST",
];

export function inquiriesByStage(inquiries: Inquiry[]): Record<Inquiry["stage"], Inquiry[]> {
  return INQUIRY_STAGES.reduce(
    (acc, stage) => {
      acc[stage] = inquiries.filter((i) => i.stage === stage);
      return acc;
    },
    {} as Record<Inquiry["stage"], Inquiry[]>,
  );
}

export function conversionRate(inquiries: Inquiry[]): number {
  if (!inquiries.length) return 0;
  return Math.round((inquiries.filter((i) => i.stage === "ENROLLED").length / inquiries.length) * 100);
}

// ---------------------------------------------------------------- progress

export function latestReport(reports: ProgressReport[], studentId: string): ProgressReport | undefined {
  return reports
    .filter((r) => r.studentId === studentId && r.publishedAt)
    .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))[0];
}

export function milestonesOf(milestones: Milestone[], studentId: string): Milestone[] {
  return milestones
    .filter((m) => m.studentId === studentId)
    .sort((a, b) => b.achievedOn.localeCompare(a.achievedOn));
}

export function skillSeries(report: ProgressReport | undefined): SeriesPoint[] {
  const keys: SkillKey[] = ["cognitive", "language", "motor", "social", "emotional", "creative"];
  const labels = ["Cognitive", "Language", "Motor", "Social", "Emotional", "Creative"];
  return keys.map((k, i) => ({ label: labels[i], value: report?.scores[k] ?? 0 }));
}
