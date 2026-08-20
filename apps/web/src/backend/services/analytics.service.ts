/**
 * The admin analytics tabs (SoW §7.16).
 *
 * Every series here is computed from the tables rather than stored, so the
 * charts cannot drift from the records they claim to describe. They are
 * branch-scoped like everything else: a branch admin's "fee collection" is
 * their own branch's, not the group's.
 */
import { prisma, type Prisma } from "@/backend/database/client";
import { requireRole } from "@/backend/utils/rbac.util";
import { branchWhere, type Scope } from "@/backend/utils/scope.util";
import { ROLES, type Role } from "@/shared/constants/roles";
import type { AnalyticsSnapshot, SeriesPoint } from "@/shared/types/ops.types";
import type { SkillKey } from "@/shared/types/learning.types";

const ADMINS: Role[] = [ROLES.SUPER_ADMIN, ROLES.ADMIN];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** The last `n` months as [label, start, end) windows, oldest first. */
function lastMonths(n: number): { label: string; from: Date; to: Date }[] {
  const out: { label: string; from: Date; to: Date }[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const to = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 1));
    out.push({ label: MONTHS[from.getUTCMonth()], from, to });
  }
  return out;
}

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

export const analyticsService = {
  async snapshot(scope: Scope): Promise<AnalyticsSnapshot> {
    requireRole(scope.role, ADMINS);
    const [attendanceTrend, feeCollection, engagement, gameUsage, learningProgress, retention] =
      await Promise.all([
        this.attendanceTrend(scope),
        this.feeCollection(scope),
        this.engagement(),
        this.gameUsage(),
        this.learningProgress(scope),
        this.retention(scope),
      ]);
    return { attendanceTrend, feeCollection, engagement, gameUsage, learningProgress, retention };
  },

  /** Percentage present, per day, for the last two working weeks. */
  async attendanceTrend(scope: Scope): Promise<SeriesPoint[]> {
    const days: string[] = [];
    for (let i = 13; i >= 0; i--) {
      days.push(dayKey(new Date(Date.now() - i * 86_400_000)));
    }
    const where: Prisma.AttendanceRecordWhereInput = {
      date: { in: days },
      ...(scope.branchId ? { student: { branchId: scope.branchId } } : {}),
    };
    const rows = await prisma.attendanceRecord.groupBy({
      by: ["date", "status"],
      where,
      _count: { _all: true },
    });
    return days.map((date) => {
      const forDay = rows.filter((r) => r.date === date);
      const total = forDay.reduce((s, r) => s + r._count._all, 0);
      const present = forDay
        .filter((r) => r.status === "PRESENT" || r.status === "LATE" || r.status === "HALF_DAY")
        .reduce((s, r) => s + r._count._all, 0);
      return { label: date.slice(5), value: total ? Math.round((present / total) * 100) : 0 };
    });
  },

  /** Rupees actually collected each month — payments, not invoices raised. */
  async feeCollection(scope: Scope): Promise<SeriesPoint[]> {
    const months = lastMonths(6);
    const out: SeriesPoint[] = [];
    for (const m of months) {
      const agg = await prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          paidAt: { gte: m.from, lt: m.to },
          ...(scope.branchId ? { invoice: { branchId: scope.branchId } } : {}),
        },
      });
      out.push({ label: m.label, value: agg._sum.amount ?? 0 });
    }
    return out;
  },

  /** Parent engagement: hearts and comments left on the feed, by month. */
  async engagement(): Promise<SeriesPoint[]> {
    const months = lastMonths(6);
    const out: SeriesPoint[] = [];
    for (const m of months) {
      const window = { gte: m.from, lt: m.to };
      const [reactions, comments] = await Promise.all([
        prisma.activityReaction.count({ where: { createdAt: window } }),
        prisma.activityComment.count({ where: { createdAt: window } }),
      ]);
      out.push({ label: m.label, value: reactions + comments });
    }
    return out;
  },

  /** Which games are actually being played. */
  async gameUsage(): Promise<SeriesPoint[]> {
    const rows = await prisma.gameSession.groupBy({
      by: ["gameSlug"],
      _count: { _all: true },
      orderBy: { _count: { gameSlug: "desc" } },
      take: 8,
    });
    if (!rows.length) return [];
    const games = await prisma.game.findMany({
      where: { slug: { in: rows.map((r) => r.gameSlug) } },
      select: { slug: true, title: true },
    });
    const titleOf = new Map(games.map((g) => [g.slug, g.title]));
    return rows.map((r) => ({ label: titleOf.get(r.gameSlug) ?? r.gameSlug, value: r._count._all }));
  },

  /** Average published score per skill, across the branch. */
  async learningProgress(scope: Scope): Promise<SeriesPoint[]> {
    const reports = await prisma.progressReport.findMany({
      where: {
        publishedAt: { not: null },
        ...(scope.branchId ? { student: { branchId: scope.branchId } } : {}),
      },
      select: { scores: true },
    });
    const skills: SkillKey[] = ["cognitive", "language", "motor", "social", "emotional", "creative"];
    return skills.map((skill) => {
      const values = reports
        .map((r) => (r.scores as Record<string, number> | null)?.[skill])
        .filter((v): v is number => typeof v === "number");
      const avg = values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
      return { label: skill[0].toUpperCase() + skill.slice(1), value: avg };
    });
  },

  /**
   * Retention by joining cohort: of the children who enrolled in a month, how
   * many are still active. A number below 100 is someone who left.
   */
  async retention(scope: Scope): Promise<SeriesPoint[]> {
    const months = lastMonths(6);
    const out: SeriesPoint[] = [];
    for (const m of months) {
      const base = { enrolledOn: { gte: m.from, lt: m.to }, ...branchWhere(scope) };
      const [cohort, stillHere] = await Promise.all([
        prisma.student.count({ where: base }),
        prisma.student.count({ where: { ...base, status: "ACTIVE" } }),
      ]);
      out.push({ label: m.label, value: cohort ? Math.round((stillHere / cohort) * 100) : 0 });
    }
    return out;
  },

  /** The KPI row on /admin. */
  async overview(scope: Scope) {
    requireRole(scope.role, ADMINS);
    const bw = branchWhere(scope);
    const today = dayKey(new Date());
    const [students, staff, parents, presentToday, outstanding, openEnquiries] = await Promise.all([
      prisma.student.count({ where: { ...bw, status: "ACTIVE" } }),
      prisma.staff.count({ where: { ...bw, status: "ACTIVE" } }),
      prisma.user.count({ where: { role: "PARENT", active: true } }),
      prisma.attendanceRecord.count({
        where: {
          date: today,
          status: { in: ["PRESENT", "LATE", "HALF_DAY"] },
          ...(scope.branchId ? { student: { branchId: scope.branchId } } : {}),
        },
      }),
      prisma.invoice.aggregate({
        _sum: { amount: true, paidAmount: true },
        where: { ...bw, status: { in: ["SENT", "PARTIAL", "OVERDUE"] } },
      }),
      prisma.inquiry.count({ where: { ...bw, stage: { notIn: ["ENROLLED", "LOST"] } } }),
    ]);
    return {
      students,
      staff,
      parents,
      presentToday,
      outstanding: (outstanding._sum.amount ?? 0) - (outstanding._sum.paidAmount ?? 0),
      openEnquiries,
    };
  },
};
