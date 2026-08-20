"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Images,
  ExternalLink,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

const NAV = [
  { label: "Dashboard", href: "/gms", icon: LayoutDashboard },
  { label: "Gallery", href: "/gms/gallery", icon: Images },
];

export function GmsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function logout() {
    await fetch("/api/gms/logout", { method: "POST" });
    router.push("/gms/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex bg-ck-cream/30">
      {/* Mobile top bar */}
      <header className="lg:hidden fixed inset-x-0 top-0 z-40 flex items-center justify-between bg-white/90 backdrop-blur border-b border-ck-cream px-4 h-14">
        <Logo size={36} withWordmark={false} />
        <button
          aria-label="Toggle menu"
          onClick={() => setMobileOpen((v) => !v)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-ck-cream"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-ck-cream flex flex-col transition-transform lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          "lg:static lg:translate-x-0",
        )}
      >
        <div className="hidden lg:flex h-20 items-center px-6 border-b border-ck-cream">
          <Logo size={42} withWordmark={false} />
          <div className="ml-3">
            <p className="font-[family-name:var(--font-fredoka)] text-lg font-bold text-ck-navy leading-none">
              Climb Kiddo
            </p>
            <p className="text-[10px] font-semibold tracking-widest text-ck-navy/60 mt-1">
              GMS · ADMIN
            </p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 mt-14 lg:mt-0">
          {NAV.map((n) => {
            const Icon = n.icon;
            const active =
              pathname === n.href ||
              (n.href !== "/gms" && pathname.startsWith(n.href));
            return (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors",
                  active
                    ? "bg-ck-red text-white shadow-[0_4px_0_#9a1a28]"
                    : "text-ck-navy hover:bg-ck-cream",
                )}
              >
                <Icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}

          <a
            href="/gallery"
            target="_blank"
            rel="noreferrer"
            className="mt-3 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-ck-navy/70 hover:bg-ck-cream hover:text-ck-navy"
          >
            <ExternalLink className="h-4 w-4" />
            View public site
          </a>
        </nav>

        <div className="p-3 border-t border-ck-cream">
          <Button
            variant="ghost"
            onClick={logout}
            className="w-full justify-start rounded-xl text-ck-navy/70 hover:text-ck-red hover:bg-ck-red/10 font-bold"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Backdrop for mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-20 bg-ck-navy/30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main */}
      <main className="flex-1 min-w-0 pt-14 lg:pt-0">{children}</main>
    </div>
  );
}
