"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KIDS_NAV } from "@/shared/constants/routes";
import { navIcon } from "@/frontend/components/layout/navIcons";
import { isActive } from "@/frontend/components/layout/AppSidebar";
import { useKidsProfile } from "@/frontend/hooks/useKidsProfile";
import { useHydrated } from "@/frontend/hooks/useHydrated";
import { MASCOTS } from "./mascots";
import { cn } from "@/lib/utils";

/** Playful chrome: sky background, big touch targets, mascot + star counter. */
export function KidsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const { journey, child } = useKidsProfile();
  const mascot = MASCOTS[journey.mascot];

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-ck-sky via-background to-ck-peach/40">
      <header className="sticky top-0 z-20 border-b border-white/60 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-3 py-2.5 sm:px-5">
          <Link href="/kids" className="flex items-center gap-2">
            <span className="text-2xl" aria-hidden>
              {mascot.emoji}
            </span>
            <span className="font-[family-name:var(--font-baloo)] text-lg font-extrabold text-ck-navy">
              Kids Zone
            </span>
          </Link>

          <div className="flex items-center gap-2">
            {hydrated && (
              <>
                <span className="flex items-center gap-1 rounded-full bg-ck-orange/20 px-3 py-1 text-sm font-extrabold text-amber-700">
                  <Star className="h-4 w-4 fill-ck-orange text-ck-orange" />
                  {journey.stars}
                </span>
                <span className="hidden rounded-full bg-ck-blue/20 px-3 py-1 text-sm font-bold text-sky-700 sm:inline">
                  Level {journey.level}
                </span>
                {child && (
                  <span className="hidden text-sm font-semibold text-ck-navy/70 md:inline">{child.firstName}</span>
                )}
              </>
            )}
            <Button variant="ghost" size="icon-sm" asChild aria-label="Back to the parent portal">
              <Link href="/parent">
                <LogOut />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-3 py-4 pb-28 sm:px-5 sm:py-6">{children}</main>

      {/* Big bottom nav — thumb-sized targets for small hands. */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-white/60 bg-white/85 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <ul className="mx-auto flex max-w-5xl">
          {KIDS_NAV.map((item) => {
            const Icon = navIcon(item.icon);
            const active = isActive(pathname, item.href, item.exact);
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-[56px] flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-extrabold transition",
                    active ? "text-ck-red" : "text-ck-navy/75 hover:text-ck-navy",
                  )}
                >
                  <Icon className={cn("h-6 w-6", active && "scale-110")} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
