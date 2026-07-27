"use client";

import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowRight,
  BookOpen,
  Camera,
  ClipboardCheck,
  MessageCircle,
  Sun,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useErpStore } from "@/frontend/store/erpStore";
import { useSession } from "@/frontend/store/session";
import { useStaffId } from "@/frontend/store/session";
import { useSelectedClass } from "@/frontend/hooks/useSelection";
import {
  attendanceFor,
  feedForClassrooms,
  noticesFor,
  rosterOf,
  studentName,
  weeklyAttendanceSeries,
} from "@/frontend/store/queries";
import { PageHeader } from "@/frontend/components/ui/PageHeader";
import { KpiCard } from "@/frontend/components/ui/KpiCard";
import { BarChart } from "@/frontend/components/ui/Charts";
import { EmojiAvatar, SectionCard, Tag } from "@/frontend/components/ui/Bits";
import { StatusBadge } from "@/frontend/components/ui/StatusBadge";
import { dateKey, today } from "@/shared/utils/date.util";
import { formatDayName, timeAgo } from "@/frontend/utils/formatters";

export function TeacherDashboard() {
  const session = useSession();
  const staffId = useStaffId();
  const { classroom } = useSelectedClass();

  const students = useErpStore((s) => s.students);
  const attendance = useErpStore((s) => s.attendance);
  const activities = useErpStore((s) => s.activities);
  const lessons = useErpStore((s) => s.lessons);
  const conversations = useErpStore((s) => s.conversations);
  const notices = useErpStore((s) => s.notices);
  const checkIn = useErpStore((s) => s.checkIn);

  const todayKey = dateKey(today());
  const roster = classroom ? rosterOf(students, classroom.id) : [];
  const marked = roster.filter((s) => attendanceFor(attendance, s.id, todayKey)?.status !== undefined
    && attendanceFor(attendance, s.id, todayKey)?.status !== "UNMARKED");
  const present = roster.filter((s) => {
    const st = attendanceFor(attendance, s.id, todayKey)?.status;
    return st === "PRESENT" || st === "LATE";
  });
  const pending = roster.filter((s) => {
    const st = attendanceFor(attendance, s.id, todayKey)?.status;
    return !st || st === "UNMARKED";
  });

  const todayLessons = lessons.filter((l) => l.date === todayKey && (!classroom || l.classroomId === classroom.id));
  const unread = conversations
    .filter((c) => c.participantIds.includes(staffId))
    .reduce((sum, c) => sum + c.unreadForTeacher, 0);
  const feed = classroom ? feedForClassrooms(activities, [classroom.id]).slice(0, 4) : [];
  const staffNotices = noticesFor(notices, "STAFF", classroom ? [classroom.id] : []).slice(0, 3);

  return (
    <div className="space-y-5">
      <PageHeader
        title={`${new Date().getHours() < 12 ? "Good morning" : "Good afternoon"}, ${session.name.split(" ")[0]}`}
        description={
          classroom
            ? `${classroom.name} · ${formatDayName(today())} · ${roster.length} children on the roll`
            : "No class assigned yet."
        }
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/teacher/activities">
                <Camera /> Post an update
              </Link>
            </Button>
            <Button asChild>
              <Link href="/teacher/attendance">
                <ClipboardCheck /> Mark attendance
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="On the roll" value={roster.length} accent="navy" icon={<Users className="h-4 w-4" />} />
        <KpiCard
          label="Present today"
          value={present.length}
          sub={`${marked.length}/${roster.length} marked`}
          accent={present.length ? "green" : "muted"}
        />
        <KpiCard
          label="To mark"
          value={pending.length}
          accent={pending.length ? "orange" : "muted"}
          href="/teacher/attendance"
        />
        <KpiCard label="Unread messages" value={unread} accent={unread ? "brand" : "muted"} href="/teacher/messages" icon={<MessageCircle className="h-4 w-4" />} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          {/* quick check-in */}
          <SectionCard
            title="Quick check-in"
            description="Tap a child as they arrive — this writes today's attendance."
            action={
              <Button size="xs" variant="ghost" asChild>
                <Link href="/teacher/attendance">
                  Full sheet <ArrowRight />
                </Link>
              </Button>
            }
          >
            {roster.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No children in this class yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {roster.map((s) => {
                  const rec = attendanceFor(attendance, s.id, todayKey);
                  const isIn = rec?.status === "PRESENT" || rec?.status === "LATE";
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        if (!classroom) return;
                        checkIn(s.id, classroom.id);
                        toast.success(`${s.firstName} checked in`);
                      }}
                      className={
                        isIn
                          ? "flex items-center gap-2 rounded-xl border border-ck-green/40 bg-ck-green/10 px-2.5 py-1.5 text-sm font-medium"
                          : "flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-sm font-medium transition hover:bg-muted"
                      }
                    >
                      <span aria-hidden>{s.photoEmoji}</span>
                      {s.firstName}
                      {isIn && <span className="text-ck-green">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Today's plan"
            icon={<BookOpen className="h-4 w-4 text-ck-blue" />}
            action={
              <Button size="xs" variant="ghost" asChild>
                <Link href="/teacher/lessons">
                  Planner <ArrowRight />
                </Link>
              </Button>
            }
          >
            {todayLessons.length === 0 ? (
              <p className="py-3 text-center text-sm text-muted-foreground">
                No lessons planned for today.{" "}
                <Link href="/teacher/lessons" className="font-medium text-ck-red hover:underline">
                  Plan one
                </Link>
              </p>
            ) : (
              <ul className="space-y-2.5">
                {todayLessons.map((l) => (
                  <li key={l.id} className="flex items-start justify-between gap-3 rounded-xl border p-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{l.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{l.objective}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {l.skillTags.map((t) => (
                          <Tag key={t} tone="blue">
                            {t}
                          </Tag>
                        ))}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Badge variant="outline">{l.slot.toLowerCase()}</Badge>
                      <StatusBadge status={l.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard
            title="Attendance this week"
            description={classroom ? `${classroom.name} vs school average` : undefined}
          >
            <BarChart data={weeklyAttendanceSeries(attendance)} suffix="%" color="#2BAEEC" height={160} />
          </SectionCard>
        </div>

        <div className="space-y-4">
          <SectionCard
            title="Recent posts"
            icon={<Camera className="h-4 w-4 text-ck-magenta" />}
            action={
              <Button size="xs" variant="ghost" asChild>
                <Link href="/teacher/activities">
                  All <ArrowRight />
                </Link>
              </Button>
            }
          >
            {feed.length === 0 ? (
              <p className="py-3 text-center text-sm text-muted-foreground">Nothing posted yet.</p>
            ) : (
              <ul className="space-y-2.5">
                {feed.map((a) => (
                  <li key={a.id} className="flex items-start gap-2.5">
                    <EmojiAvatar emoji={a.media[0]?.placeholder ?? "📝"} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{a.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {timeAgo(a.createdAt)} · {a.published ? `${a.comments.length} comments` : "draft"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Staff notices" icon={<Sun className="h-4 w-4 text-ck-orange" />}>
            {staffNotices.length === 0 ? (
              <p className="py-3 text-center text-sm text-muted-foreground">Nothing new.</p>
            ) : (
              <ul className="space-y-2.5">
                {staffNotices.map((n) => (
                  <li key={n.id}>
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Children needing a nudge" description="Lowest attendance in your class">
            {roster.length === 0 ? (
              <p className="py-3 text-center text-sm text-muted-foreground">—</p>
            ) : (
              <ul className="space-y-2">
                {roster
                  .map((s) => ({
                    s,
                    absent: attendance.filter((a) => a.studentId === s.id && a.status === "ABSENT").length,
                  }))
                  .sort((a, b) => b.absent - a.absent)
                  .slice(0, 4)
                  .map(({ s, absent }) => (
                    <li key={s.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex items-center gap-2">
                        <span aria-hidden>{s.photoEmoji}</span>
                        {studentName(s)}
                      </span>
                      <Badge variant={absent > 2 ? "destructive" : "outline"}>{absent} absences</Badge>
                    </li>
                  ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
