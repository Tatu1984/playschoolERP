import Link from "next/link";
import { redirect } from "next/navigation";
import { Video, ScrollText, ArrowRight } from "lucide-react";
import { getSession } from "@/backend/services/auth.service";
import { isStaff } from "@/backend/utils/rbac.util";
import { adminService } from "@/backend/services/admin.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/frontend/components/features/admin/StatCard";
import { CctvActionBadge } from "@/frontend/components/features/admin/CctvActionBadge";
import { timeAgo } from "@/frontend/utils/formatters";

export const metadata = { title: "Overview — Climb Kiddo Admin" };
export const dynamic = "force-dynamic";

export default async function AdminOverview() {
  const session = await getSession();
  if (!session || !isStaff(session.role)) redirect("/login?next=/admin");

  const [stats, activity] = await Promise.all([
    adminService.getOverview(session.role),
    adminService.recentCctvActivity(session.role, 8),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-fredoka)] text-2xl font-bold">Overview</h1>
        <p className="text-sm text-slate-500">Live snapshot of the school &amp; CCTV activity.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Students" value={stats.students} accent="slate" />
        <StatCard
          label="Cameras"
          value={stats.cameras}
          sub={`${stats.camerasEnabled} on`}
          accent="slate"
        />
        <StatCard label="Parents" value={stats.parents} accent="blue" />
        <StatCard label="Staff" value={stats.staff} accent="slate" />
        <StatCard label="Views today" value={stats.viewsToday} accent="green" />
        <StatCard
          label="Denied today"
          value={stats.deniedToday}
          accent={stats.deniedToday > 0 ? "amber" : "slate"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        {/* Recent CCTV activity */}
        <Card className="border-slate-200">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Recent CCTV activity</CardTitle>
            <Link href="/admin/audit" className="flex items-center gap-1 text-xs font-medium text-[#e63946]">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {activity.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">No activity yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {activity.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">{a.userName}</p>
                      <p className="truncate text-xs text-slate-400">
                        {a.cameraName} · {timeAgo(a.createdAt)}
                        {a.reason && a.action === "AUTHORIZE_DENIED" ? ` · ${a.reason}` : ""}
                      </p>
                    </div>
                    <CctvActionBadge action={a.action} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <QuickLink href="/admin/cameras" icon={<Video className="h-4 w-4" />} title="Manage cameras" desc="Add, map to classrooms, kill-switch" />
            <QuickLink href="/admin/audit" icon={<ScrollText className="h-4 w-4" />} title="CCTV audit log" desc="Who watched what, and when" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function QuickLink({
  href,
  icon,
  title,
  desc,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 transition hover:border-slate-300 hover:bg-slate-50"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#e63946]/10 text-[#e63946]">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-slate-800">{title}</span>
        <span className="block truncate text-xs text-slate-400">{desc}</span>
      </span>
    </Link>
  );
}
