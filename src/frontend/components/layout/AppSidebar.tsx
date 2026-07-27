"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink } from "lucide-react";
import type { NavGroup } from "@/shared/constants/routes";
import { navIcon } from "./navIcons";
import { cn } from "@/lib/utils";

export type BadgeCounts = Partial<Record<NonNullable<NavGroup["items"][number]["badge"]>, number>>;

export function isActive(pathname: string, href: string, exact?: boolean): boolean {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebar({
  nav,
  badges = {},
  brandLabel,
  homeHref,
  footer,
  header,
  onNavigate,
}: {
  nav: NavGroup[];
  badges?: BadgeCounts;
  brandLabel: string;
  homeHref: string;
  footer?: React.ReactNode;
  header?: React.ReactNode;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 py-4">
        <Link href={homeHref} onClick={onNavigate} className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-ck-red font-heading text-sm font-bold text-white">
            CK
          </span>
          <span className="flex flex-col leading-tight">
            <span className="font-heading text-sm font-bold">Climb Kiddo</span>
            <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              {brandLabel}
            </span>
          </span>
        </Link>
      </div>

      {header && <div className="px-3 pb-3">{header}</div>}

      <nav className="flex-1 space-y-4 overflow-y-auto px-3 pb-4">
        {nav.map((group, gi) => (
          <div key={group.label ?? `g${gi}`} className="space-y-0.5">
            {group.label && (
              <p className="px-3 pt-2 pb-1 text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                {group.label}
              </p>
            )}
            {group.items.map((item) => {
              const Icon = navIcon(item.icon);
              const active = isActive(pathname, item.href, item.exact);
              const count = item.badge ? (badges[item.badge] ?? 0) : 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition",
                    active
                      ? "bg-ck-red/10 text-ck-red"
                      : "text-foreground/70 hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate">{item.label}</span>
                  {count > 0 && (
                    <span className="grid h-5 min-w-5 place-items-center rounded-full bg-ck-red px-1 text-[10px] font-bold text-white">
                      {count > 99 ? "99+" : count}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t p-3">
        {footer}
        <Link
          href="/"
          onClick={onNavigate}
          className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Visit public website
        </Link>
      </div>
    </div>
  );
}
