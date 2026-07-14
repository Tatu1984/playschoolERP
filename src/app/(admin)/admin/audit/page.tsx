import { redirect } from "next/navigation";
import { getSession } from "@/backend/services/auth.service";
import { isStaff } from "@/backend/utils/rbac.util";
import { adminService } from "@/backend/services/admin.service";
import { Card, CardContent } from "@/components/ui/card";
import { CctvActionBadge } from "@/frontend/components/features/admin/CctvActionBadge";
import { formatDateTime } from "@/frontend/utils/formatters";

export const metadata = { title: "CCTV Audit — Climb Kiddo Admin" };
export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  const session = await getSession();
  if (!session || !isStaff(session.role)) redirect("/login?next=/admin/audit");

  const rows = await adminService.recentCctvActivity(session.role, 200);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-fredoka)] text-2xl font-bold">CCTV Audit Log</h1>
        <p className="text-sm text-slate-500">
          Every authorize decision, token issued, and view start — for child-safety
          accountability. Showing the latest {rows.length} events.
        </p>
      </div>

      <Card className="border-slate-200">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Camera</th>
                  <th className="px-4 py-3 font-medium">Event</th>
                  <th className="px-4 py-3 font-medium">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                      No CCTV activity recorded yet.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatDateTime(r.createdAt)}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{r.userName}</td>
                      <td className="px-4 py-3 text-slate-500">{r.userRole}</td>
                      <td className="px-4 py-3 text-slate-600">{r.cameraName}</td>
                      <td className="px-4 py-3"><CctvActionBadge action={r.action} /></td>
                      <td className="px-4 py-3 text-slate-400">{r.reason ?? "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
