"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, PanelLeft, Settings, UserRound } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { NavGroup, NavItem } from "@/shared/constants/routes";
import { useSession } from "@/frontend/store/session";
import { initials } from "@/shared/utils/common.util";
import { navIcon } from "./navIcons";
import { AppSidebar, isActive, type BadgeCounts } from "./AppSidebar";
import { NotificationBell } from "./NotificationBell";
import { cn } from "@/lib/utils";

/**
 * Shared chrome for /admin, /teacher and /parent: fixed sidebar on desktop,
 * drawer on mobile, sticky topbar with notifications and the account menu,
 * and an optional bottom tab bar (parent portal).
 */
export function AppShell({
  brandLabel,
  homeHref,
  nav,
  tabs,
  badges,
  children,
  sidebarHeader,
  topbarExtra,
  accountHref,
  settingsHref,
  wide = false,
}: {
  brandLabel: string;
  homeHref: string;
  nav: NavGroup[];
  tabs?: NavItem[];
  badges?: BadgeCounts;
  children: React.ReactNode;
  sidebarHeader?: React.ReactNode;
  topbarExtra?: React.ReactNode;
  accountHref?: string;
  settingsHref?: string;
  wide?: boolean;
}) {
  const session = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const currentLabel =
    nav
      .flatMap((g) => g.items)
      .find((i) => isActive(pathname, i.href, i.exact))?.label ?? brandLabel;

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r bg-card lg:block">
        <AppSidebar nav={nav} badges={badges} brandLabel={brandLabel} homeHref={homeHref} header={sidebarHeader} />
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b bg-card/85 px-3 backdrop-blur sm:px-5">
          <div className="flex min-w-0 items-center gap-2">
            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
              <SheetTrigger
                render={<Button variant="ghost" size="icon-sm" className="lg:hidden" />}
                aria-label="Open navigation"
              >
                <PanelLeft />
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <AppSidebar
                  nav={nav}
                  badges={badges}
                  brandLabel={brandLabel}
                  homeHref={homeHref}
                  header={sidebarHeader}
                  onNavigate={() => setDrawerOpen(false)}
                />
              </SheetContent>
            </Sheet>
            <span className="truncate font-heading text-sm font-bold">{currentLabel}</span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {topbarExtra}
            <NotificationBell />
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="ghost" size="sm" className="gap-2 pr-1.5 pl-1.5" />}
                aria-label="Account menu"
              >
                <span className="grid h-6 w-6 place-items-center rounded-full bg-ck-navy text-[10px] font-bold text-white">
                  {initials(session.name)}
                </span>
                <span className="hidden max-w-28 truncate text-xs font-medium sm:inline">{session.name}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="py-1.5">
                  <span className="block text-sm font-semibold text-foreground">{session.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{session.email}</span>
                  <span className="mt-1 inline-flex rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase">
                    {session.role.replace("_", " ")}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {accountHref && (
                  <DropdownMenuItem
                    className="gap-2 px-2 py-1.5"
                    onClick={() => router.push(accountHref)}
                  >
                    <UserRound /> Profile
                  </DropdownMenuItem>
                )}
                {settingsHref && (
                  <DropdownMenuItem
                    className="gap-2 px-2 py-1.5"
                    onClick={() => router.push(settingsHref)}
                  >
                    <Settings /> Settings
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" className="gap-2 px-2 py-1.5" onClick={signOut}>
                  <LogOut /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main
          id="main"
          className={cn(
            "mx-auto px-3 py-5 sm:px-5 sm:py-6",
            wide ? "max-w-[1400px]" : "max-w-6xl",
            tabs && "pb-24 lg:pb-6",
          )}
        >
          {children}
        </main>
      </div>

      {tabs && <MobileTabBar tabs={tabs} badges={badges} />}
    </div>
  );
}

function MobileTabBar({ tabs, badges = {} }: { tabs: NavItem[]; badges?: BadgeCounts }) {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <ul className="flex">
        {tabs.map((tab) => {
          const Icon = navIcon(tab.icon);
          const active = isActive(pathname, tab.href, tab.exact);
          const count = tab.badge ? (badges[tab.badge] ?? 0) : 0;
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold transition",
                  active ? "text-ck-red" : "text-muted-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                {tab.label}
                {count > 0 && (
                  <span className="absolute top-1 right-[22%] grid h-4 min-w-4 place-items-center rounded-full bg-ck-red px-1 text-[9px] font-bold text-white">
                    {count > 9 ? "9+" : count}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
