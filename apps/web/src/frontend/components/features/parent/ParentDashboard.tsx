"use client";

import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowRight,
  Camera,
  CalendarDays,
  Heart,
  Megaphone,
  MessageCircle,
  Moon,
  Utensils,
  Video,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useErpStore } from "@/frontend/store/erpStore";
import { useSession } from "@/frontend/store/session";
import { useSelectedChild } from "@/frontend/hooks/useSelection";
import {
  attendanceFor,
  attendanceRate,
  feedForStudents,
  invoicesFor,
  latestReport,
  milestonesOf,
  noticesFor,
  outstandingOf,
  skillSeries,
  studentName,
  upcomingEvents,
} from "@/frontend/store/queries";
import { PageHeader } from "@/frontend/components/ui/PageHeader";
import { KpiCard } from "@/frontend/components/ui/KpiCard";
import { SectionCard, EmojiAvatar, Tag } from "@/frontend/components/ui/Bits";
import { SkillBars } from "@/frontend/components/ui/Charts";
import { StatusBadge } from "@/frontend/components/ui/StatusBadge";
import { EmptyState } from "@/frontend/components/ui/EmptyState";
import { CATALOGUE } from "@/shared/fixtures";
import { formatMoney } from "@/shared/utils/common.util";
import { clockNow, dateKey, today, withinWindow } from "@/shared/utils/date.util";
import { formatDateTime, formatTime, relativeDays, timeAgo } from "@/frontend/utils/formatters";
import { CoverageNote } from "@/frontend/components/ui/CoverageNote";

const MOOD_EMOJI: Record<string, string> = {
  HAPPY: "😄",
  CALM: "🙂",
  SLEEPY: "😴",
  FUSSY: "😖",
  UNWELL: "🤒",
};

export function ParentDashboard() {
  const session = useSession();
  const { child, kids } = useSelectedChild();

  const classrooms = useErpStore((s) => s.classrooms);
  const branches = useErpStore((s) => s.branches);
  const attendance = useErpStore((s) => s.attendance);
  const activities = useErpStore((s) => s.activities);
  const notices = useErpStore((s) => s.notices);
  const invoices = useErpStore((s) => s.invoices);
  const events = useErpStore((s) => s.events);
  const reports = useErpStore((s) => s.progressReports);
  const milestones = useErpStore((s) => s.milestones);
  const journeys = useErpStore((s) => s.journeys);
  const toggleReaction = useErpStore((s) => s.toggleActivityReaction);

  if (!child) {
    return (
      <EmptyState
        emoji="👶"
        title="No child linked to this account"
        description="Ask the school office to link your child to your login."
      />
    );
  }

  const classroom = classrooms.find((c) => c.id === child.classroomId);
  const branch = branches.find((b) => b.id === child.branchId);
  const todayRec = attendanceFor(attendance, child.id, dateKey(today()));
  const feed = feedForStudents(activities, [child.id]).slice(0, 3);
  const myNotices = noticesFor(notices, "PARENTS", classroom ? [classroom.id] : []).slice(0, 3);
  const myInvoices = invoicesFor(invoices, kids.map((k) => k.id));
  const due = outstandingOf(myInvoices);
  const nextInvoice = myInvoices.find((i) => i.status !== "PAID");
  const journey = journeys.find((j) => j.studentId === child.id);
  const report = latestReport(reports, child.id);
  const cameraOpen = branch ? withinWindow(branch.opensAt, branch.closesAt, clockNow()) : false;

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Hi ${session.name.split(" ")[0]} 👋`}
        description={`Here's how ${child.firstName}'s day is going.`}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/parent/messages">
                <MessageCircle /> Message teacher
              </Link>
            </Button>
            <Button asChild>
              <Link href="/parent/cctv">
                <Video /> Watch live
              </Link>
            </Button>
          </>
        }
      />

      {/* child hero */}
      <div className="rounded-3xl bg-gradient-to-br from-ck-blue/15 via-ck-orange/10 to-ck-magenta/10 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-4">
          <EmojiAvatar emoji={child.photoEmoji} size="xl" ring />
          <div className="min-w-0 flex-1">
            <h2 className="font-heading text-xl font-bold">{studentName(child)}</h2>
            <p className="text-sm text-muted-foreground">
              {classroom?.name ?? "—"} · {CATALOGUE.programs.find((p) => p.slug === child.programSlug)?.name} ·{" "}
              {branch?.name}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <StatusBadge status={todayRec?.status ?? "UNMARKED"} />
              {todayRec?.checkInAt && <Badge variant="outline">In {formatTime(todayRec.checkInAt)}</Badge>}
              {todayRec?.checkOutAt && <Badge variant="outline">Out {formatTime(todayRec.checkOutAt)}</Badge>}
              {todayRec?.mood && (
                <Badge variant="secondary">
                  {MOOD_EMOJI[todayRec.mood]} {todayRec.mood.toLowerCase()}
                </Badge>
              )}
              <Badge variant={cameraOpen ? "default" : "outline"}>
                {cameraOpen ? "🔴 Camera live now" : `Camera opens ${branch?.opensAt ?? "08:00"}`}
              </Badge>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="font-heading text-2xl font-bold">{attendanceRate(attendance, child.id)}%</p>
              <p className="text-[10px] tracking-wide text-muted-foreground uppercase">Attendance</p>
            </div>
            <div>
              <p className="font-heading text-2xl font-bold">{journey?.stars ?? 0}</p>
              <p className="text-[10px] tracking-wide text-muted-foreground uppercase">Stars</p>
            </div>
            <div>
              <p className="font-heading text-2xl font-bold">{milestonesOf(milestones, child.id).length}</p>
              <p className="text-[10px] tracking-wide text-muted-foreground uppercase">Milestones</p>
            </div>
          </div>
          {/* The attendance figure above is for the loaded window, not the year. */}
          <CoverageNote collection="attendance" noun="Attendance" className="mt-3 justify-center" />
        </div>
      </div>

      {/* today's report */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Meals"
          value={todayRec?.mealsEaten ? todayRec.mealsEaten.toLowerCase() : "—"}
          accent="green"
          icon={<Utensils className="h-4 w-4" />}
        />
        <KpiCard
          label="Nap"
          value={todayRec?.napMinutes ? `${todayRec.napMinutes} min` : "—"}
          accent="blue"
          icon={<Moon className="h-4 w-4" />}
        />
        <KpiCard
          label="Fees due"
          value={due > 0 ? formatMoney(due) : "All clear"}
          accent={due > 0 ? "brand" : "green"}
          href="/parent/payments"
          sub={nextInvoice ? `due ${relativeDays(nextInvoice.dueOn)}` : undefined}
          icon={<Wallet className="h-4 w-4" />}
        />
        <KpiCard
          label="Unread notices"
          value={myNotices.filter((n) => !n.readBy.includes(session.id)).length}
          accent="orange"
          href="/parent/notices"
          icon={<Megaphone className="h-4 w-4" />}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          {/* feed preview */}
          <SectionCard
            title="Today at school"
            icon={<Camera className="h-4 w-4 text-ck-magenta" />}
            action={
              <Button size="xs" variant="ghost" asChild>
                <Link href="/parent/feed">
                  Full feed <ArrowRight />
                </Link>
              </Button>
            }
          >
            {feed.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No updates yet today.</p>
            ) : (
              <ul className="space-y-3">
                {feed.map((a) => (
                  <li key={a.id} className="rounded-2xl border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{a.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {a.authorName} · {timeAgo(a.createdAt)}
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label="Like this update"
                        onClick={() => {
                          toggleReaction(a.id, session.id);
                          if (!a.reactions.includes(session.id)) toast.success("❤️");
                        }}
                        className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground transition hover:text-ck-red"
                      >
                        <Heart
                          className={a.reactions.includes(session.id) ? "h-4 w-4 fill-ck-red text-ck-red" : "h-4 w-4"}
                        />
                        {a.reactions.length}
                      </button>
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{a.body}</p>
                    {a.media.length > 0 && (
                      <div className="mt-2 flex gap-2 overflow-x-auto">
                        {a.media.map((m) => (
                          <span key={m.id} className="grid h-16 w-24 shrink-0 place-items-center rounded-lg bg-muted text-2xl" aria-hidden>
                            {m.placeholder ?? "🖼️"}
                          </span>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          {/* progress */}
          <SectionCard
            title="Development snapshot"
            description={report ? report.term : "No report published yet"}
            action={
              <Button size="xs" variant="ghost" asChild>
                <Link href="/parent/reports">
                  Reports <ArrowRight />
                </Link>
              </Button>
            }
          >
            {report ? (
              <>
                <SkillBars data={skillSeries(report)} />
                <p className="mt-3 rounded-xl bg-muted/50 p-3 text-sm">{report.teacherRemark}</p>
              </>
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Your child&apos;s first report will appear here at the end of the term.
              </p>
            )}
          </SectionCard>
        </div>

        <div className="space-y-4">
          <SectionCard
            title="Notices"
            icon={<Megaphone className="h-4 w-4 text-ck-orange" />}
            action={
              <Button size="xs" variant="ghost" asChild>
                <Link href="/parent/notices">
                  All <ArrowRight />
                </Link>
              </Button>
            }
          >
            {myNotices.length === 0 ? (
              <p className="py-3 text-center text-sm text-muted-foreground">Nothing new.</p>
            ) : (
              <ul className="space-y-2.5">
                {myNotices.map((n) => (
                  <li key={n.id}>
                    <Link href="/parent/notices" className="block">
                      <p className="flex items-center gap-1.5 text-sm font-medium">
                        {n.pinned && <span aria-hidden>📌</span>}
                        {n.title}
                        {!n.readBy.includes(session.id) && <span className="h-1.5 w-1.5 rounded-full bg-ck-red" />}
                      </p>
                      <p className="line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard
            title="Coming up"
            icon={<CalendarDays className="h-4 w-4 text-ck-magenta" />}
            action={
              <Button size="xs" variant="ghost" asChild>
                <Link href="/parent/events">
                  All <ArrowRight />
                </Link>
              </Button>
            }
          >
            {upcomingEvents(events, 3).length === 0 ? (
              <p className="py-3 text-center text-sm text-muted-foreground">Nothing scheduled.</p>
            ) : (
              <ul className="space-y-2.5">
                {upcomingEvents(events, 3).map((e) => (
                  <li key={e.id} className="flex items-start gap-2.5">
                    <span className="text-lg" aria-hidden>
                      {e.coverEmoji}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{e.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatDateTime(e.startsAt)} · {relativeDays(e.startsAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Kids Zone" description="Learning games and stories for your child">
            <div className="flex items-center gap-3">
              <span className="text-3xl" aria-hidden>
                🎈
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  Level {journey?.level ?? 1} · {journey?.stars ?? 0} stars
                </p>
                <p className="text-xs text-muted-foreground">
                  {journey?.streakDays ?? 0}-day streak · {journey?.unlockedBadges.length ?? 0} badges
                </p>
              </div>
              <Button size="sm" asChild>
                <Link href="/kids">Open</Link>
              </Button>
            </div>
          </SectionCard>

          {child.allergies.length > 0 && (
            <SectionCard title="On file with the school">
              <div className="flex flex-wrap gap-1.5">
                {child.allergies.map((a) => (
                  <Tag key={a} tone="brand">
                    ⚠️ {a}
                  </Tag>
                ))}
              </div>
              <Button size="xs" variant="ghost" className="mt-2" asChild>
                <Link href="/parent/emergency">
                  Update medical info <ArrowRight />
                </Link>
              </Button>
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  );
}
