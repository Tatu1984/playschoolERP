import { redirect } from "next/navigation";
import { getSession } from "@/backend/services/auth.service";
import { isStaff } from "@/backend/utils/rbac.util";
import { LogoutButton } from "@/frontend/components/features/auth/LogoutButton";
import { AdminSidebar } from "@/frontend/components/features/admin/AdminSidebar";
import { MobileSidebar } from "@/frontend/components/features/admin/MobileSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login?next=/admin");
  if (!isStaff(session.role)) redirect("/");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Fixed sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 border-r border-slate-200 bg-white md:block">
        <AdminSidebar />
      </aside>

      <div className="md:pl-60">
        {/* Topbar */}
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <MobileSidebar />
            <span className="font-[family-name:var(--font-fredoka)] text-sm font-semibold text-slate-500 md:hidden">
              Climb Kiddo Admin
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right leading-tight sm:block">
              <p className="text-sm font-medium text-slate-800">{session.name}</p>
              <p className="text-[11px] uppercase tracking-wide text-slate-400">{session.role}</p>
            </div>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-slate-200 text-xs font-bold text-slate-600">
              {initials(session.name)}
            </span>
            <LogoutButton />
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}
