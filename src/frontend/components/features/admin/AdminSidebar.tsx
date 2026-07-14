"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Video,
  ScrollText,
  Users,
  UserCog,
  Wallet,
  Bell,
  Settings,
  Circle,
  type LucideIcon,
} from "lucide-react";
import { ADMIN_NAV } from "@/shared/constants/routes";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  Video,
  ScrollText,
  Users,
  UserCog,
  Wallet,
  Bell,
  Settings,
};

export function AdminSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex h-full flex-col gap-1 p-3">
      <div className="px-3 py-4">
        <Link href="/admin" onClick={onNavigate} className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#e63946] text-sm font-bold text-white">
            CK
          </span>
          <span className="flex flex-col leading-tight">
            <span className="font-[family-name:var(--font-fredoka)] text-sm font-bold text-slate-900">
              Climb Kiddo
            </span>
            <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Admin
            </span>
          </span>
        </Link>
      </div>

      {ADMIN_NAV.map((item) => {
        const Icon = ICONS[item.icon] ?? Circle;
        const active =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(item.href);

        if (item.soon) {
          return (
            <span
              key={item.href}
              className="flex cursor-not-allowed items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-400"
            >
              <span className="flex items-center gap-3">
                <Icon className="h-4 w-4" />
                {item.label}
              </span>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
                soon
              </span>
            </span>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
              active
                ? "bg-[#e63946]/10 text-[#e63946]"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
