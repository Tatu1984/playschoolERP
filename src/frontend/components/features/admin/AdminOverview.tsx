"use client";

import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowRight,
  CalendarDays,
  ClipboardList,
  Megaphone,
  Plus,
  ScrollText,
  UserPlus,
  Users,
  Video,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useErpStore } from "@/frontend/store/erpStore";
import { useSession } from "@/frontend/store/session";
import { useBranchScope } from "@/frontend/hooks/useSelection";
import {
  attendanceOnDate,
  collectedOf,
  outstandingOf,
  presentTodayCount,
  upcomingEvents,
  weeklyAttendanceSeries,
} from "@/frontend/store/queries";
import { PageHeader } from "@/frontend/components/ui/PageHeader";
import { KpiCard } from "@/frontend/components/ui/KpiCard";
import { BarChart, DonutChart } from "@/frontend/components/ui/Charts";
import { SectionCard, Timeline } from "@/frontend/components/ui/Bits";
import { StatusBadge } from "@/frontend/components/ui/StatusBadge";
import { formatMoney } from "@/shared/utils/common.util";
import { dateKey, today } from "@/shared/utils/date.util";
import { formatDateTime, relativeDays, timeAgo } from "@/frontend/utils/formatters";

export interface CctvSnapshot {
  cameras: number;
  camerasEnabled: number;
  viewsToday: number;
  deniedToday: number;
  recent: { id: string; userName: string; cameraName: string; action: string; createdAt: string; reason: string | null }[];
  /** False when the ERP database is unreachable (demo without Postgres). */
  live: boolean;
}

export function AdminOverview({ cctv }: { cctv: CctvSnapshot }) {
  const session = useSession();
  const { inScope } = useBranchScope();

  const students = useErpStore((s) => s.students);
  const staff = useErpStore((s) => s.staff);
  const guardians = useErpStore((s) => s.guardians);
  const attendance = useErpStore((s) => s.attendance);
  const invoices = useErpStore((s) => s.invoices);
  const inquiries = useErpStore((s) => s.inquiries);
  const applications = useErpStore((s) => s.applications);
  const notices = useErpStore((s) => s.notices);
  const events = useErpStore((s) => s.events);
  const activities = useErpStore((s) => s.activities);
  const audit = useErpStore((s) => s.auditEntries);

  const scopedStudents = inScope(students);
  const scopedInvoices = inScope(invoices);
  const todayKey = dateKey(today());
  const markedToday = attendanceOnDate(attendance, todayKey).filter((a) => a.status !== "UNMARKED").length;
  const present = presentTodayCount(attendance);
  const newLeads = inquiries.filter((i) => i.stage === "NEW").length;

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, ${session.name.split(" ")[0]}`}
        description="Everything happening across the school today."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/admin/notices">
                <Megaphone /> Post a notice
              </Link>
            </Button>
            <Button asChild>
              <Link href="/admin/students">
                <UserPlus /> Enrol student
              </Link>
            </Button>
          </>
        }
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Students" value={scopedStudents.length} accent="navy" icon={<Users className="h-4 w-4" />} href="/admin/students" />
        <KpiCard
          label="Present today"
          value={present}
          sub={`${markedToday} marked`}
          accent={present > 0 ? "green" : "muted"}
        />
        <KpiCard label="Staff" value={staff.length} accent="blue" href="/admin/staff" />
        <KpiCard label="Parents" value={guardians.length} accent="magenta" />
        <KpiCard
          label="Outstanding"
          value={formatMoney(outstandingOf(scopedInvoices))}
          accent="brand"
          href="/admin/fees"
          sub={`${scopedInvoices.filter((i) => i.status === "OVERDUE").length} overdue`}
        />
        <KpiCard
          label="New enquiries"
          value={newLeads}
          accent={newLeads ? "orange" : "muted"}
          href="/admin/admissions"
          icon={<ClipboardList className="h-4 w-4" />}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        {/* Attendance + fees */}
        <div className="space-y-4">
          <SectionCard
            title="Attendance this week"
            description="Percentage of marked children present"
            action={
              <Button size="xs" variant="ghost" asChild>
                <Link href="/admin/analytics">
                  Analytics <ArrowRight />
                </Link>
              </Button>
            }
          >
            <BarChart data={weeklyAttendanceSeries(attendance)} suffix="%" color="#8BC53F" height={170} />
          </SectionCard>

          <div className="grid gap-4 md:grid-cols-2">
            <SectionCard title="Fee status" description={`${formatMoney(collectedOf(scopedInvoices))} collected`}>
              <DonutChart
                size={130}
                thickness={16}
                data={[
                  { label: "Paid", value: scopedInvoices.filter((i) => i.status === "PAID").length },
                  { label: "Partial", value: scopedInvoices.filter((i) => i.status === "PARTIAL").length },
                  { label: "Sent", value: scopedInvoices.filter((i) => i.status === "SENT").length },
                  { label: "Overdue", value: scopedInvoices.filter((i) => i.status === "OVERDUE").length },
                ]}
                centerLabel="invoices"
              />
            </SectionCard>

            <SectionCard
              title="Admissions funnel"
              action={
                <Button size="xs" variant="ghost" asChild>
                  <Link href="/admin/admissions">
                    Open <ArrowRight />
                  </Link>
                </Button>
              }
            >
              <ul className="space-y-2 text-sm">
                {[
                  ["New enquiries", inquiries.filter((i) => i.stage === "NEW").length],
                  ["In conversation", inquiries.filter((i) => ["CONTACTED", "VISIT_SCHEDULED"].includes(i.stage)).length],
                  ["Applications", applications.length],
                  ["Enrolled this term", inquiries.filter((i) => i.stage === "ENROLLED").length],
                ].map(([label, value]) => (
                  <li key={label as string} className="flex items-center justify-between">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-semibold tabular-nums">{value}</span>
                  </li>
                ))}
              </ul>
            </SectionCard>
          </div>

          {/* CCTV — the one section backed by the real database */}
          <SectionCard
            title="CCTV activity"
            description={cctv.live ? "Live from the ERP database" : "Database unavailable — showing zeroes"}
            icon={<Video className="h-4 w-4 text-ck-red" />}
            action={
              <Button size="xs" variant="ghost" asChild>
                <Link href="/admin/audit">
                  Full log <ArrowRight />
                </Link>
              </Button>
            }
          >
            <div className="mb-3 grid grid-cols-3 gap-3">
              <div>
                <p className="text-xs text-muted-foreground uppercase">Cameras</p>
                <p className="font-heading text-xl font-bold">
                  {cctv.camerasEnabled}
                  <span className="text-sm text-muted-foreground">/{cctv.cameras}</span>
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">Views today</p>
                <p className="font-heading text-xl font-bold text-emerald-600">{cctv.viewsToday}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">Denied</p>
                <p className={`font-heading text-xl font-bold ${cctv.deniedToday ? "text-amber-600" : ""}`}>
                  {cctv.deniedToday}
                </p>
              </div>
            </div>
            {cctv.recent.length === 0 ? (
              <p className="py-3 text-center text-sm text-muted-foreground">No camera activity yet today.</p>
            ) : (
              <ul className="divide-y">
                {cctv.recent.slice(0, 5).map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{r.userName}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {r.cameraName} · {timeAgo(r.createdAt)}
                        {r.reason ? ` · ${r.reason}` : ""}
                      </p>
                    </div>
                    <StatusBadge
                      status={r.action}
                      label={r.action.replace("AUTHORIZE_", "").replace("_", " ").toLowerCase()}
                      tone={r.action === "AUTHORIZE_DENIED" ? "danger" : r.action === "VIEW_START" ? "success" : "info"}
                    />
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>

        {/* Right rail */}
        <div className="space-y-4">
          <SectionCard title="Quick actions">
            <div className="grid gap-2">
              {[
                { href: "/admin/students", icon: <UserPlus className="h-4 w-4" />, title: "Enrol a student", desc: "Add a child and guardian" },
                { href: "/admin/fees", icon: <Wallet className="h-4 w-4" />, title: "Fees & invoices", desc: "Collect and reconcile" },
                { href: "/admin/notices", icon: <Megaphone className="h-4 w-4" />, title: "Post a notice", desc: "Push to parents instantly" },
                { href: "/admin/cameras", icon: <Video className="h-4 w-4" />, title: "Manage cameras", desc: "Map rooms, kill-switch" },
                { href: "/admin/audit", icon: <ScrollText className="h-4 w-4" />, title: "Audit log", desc: "Who did what, when" },
              ].map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  className="flex items-center gap-3 rounded-xl border p-2.5 transition hover:border-ck-red/40 hover:bg-muted/50"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ck-red/10 text-ck-red">
                    {a.icon}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{a.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{a.desc}</span>
                  </span>
                </Link>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Coming up"
            icon={<CalendarDays className="h-4 w-4 text-ck-magenta" />}
            action={
              <Button size="xs" variant="ghost" asChild>
                <Link href="/admin/events">
                  All <ArrowRight />
                </Link>
              </Button>
            }
          >
            {upcomingEvents(events, 4).length === 0 ? (
              <p className="py-3 text-center text-sm text-muted-foreground">Nothing scheduled.</p>
            ) : (
              <ul className="space-y-2.5">
                {upcomingEvents(events, 4).map((e) => (
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

          <SectionCard
            title="Recent admin activity"
            action={
              <Button
                size="xs"
                variant="ghost"
                onClick={() => toast.info("Full audit trail lives in Audit log")}
              >
                <Plus />
              </Button>
            }
          >
            <Timeline
              items={audit.slice(0, 5).map((a) => ({
                id: a.id,
                icon: "•",
                title: a.action,
                meta: timeAgo(a.createdAt),
                body: (
                  <span>
                    <span className="font-medium text-foreground">{a.actorName}</span> — {a.detail}
                  </span>
                ),
              }))}
            />
          </SectionCard>

          <SectionCard title="Today at a glance">
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between">
                <span className="text-muted-foreground">Activity posts</span>
                <Badge variant="secondary">{activities.filter((a) => a.published).length}</Badge>
              </li>
              <li className="flex justify-between">
                <span className="text-muted-foreground">Live notices</span>
                <Badge variant="secondary">{notices.filter((n) => n.publishedAt).length}</Badge>
              </li>
              <li className="flex justify-between">
                <span className="text-muted-foreground">Unmarked attendance</span>
                <Badge variant={scopedStudents.length - markedToday > 0 ? "destructive" : "secondary"}>
                  {Math.max(0, scopedStudents.length - markedToday)}
                </Badge>
              </li>
            </ul>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
