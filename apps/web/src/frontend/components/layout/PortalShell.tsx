"use client";

import { ADMIN_NAV, PARENT_NAV, PARENT_TABS, TEACHER_NAV } from "@/shared/constants/routes";
import { SessionProvider, type SessionUser } from "@/frontend/store/session";
import { useBadgeCounts } from "@/frontend/hooks/useBadgeCounts";
import { AppShell } from "./AppShell";
import { ChildSwitcher } from "@/frontend/components/features/parent/ChildSwitcher";
import { ClassSwitcher } from "@/frontend/components/features/teacher/ClassSwitcher";
import { BranchSwitcher } from "@/frontend/components/features/admin/BranchSwitcher";

/**
 * One client entry point per surface. The server layout does the auth check and
 * passes the session down; everything below here is client-side so the demo
 * store, badges and switchers work without a round trip.
 */
export function PortalShell({
  surface,
  user,
  children,
}: {
  surface: "admin" | "teacher" | "parent";
  user: SessionUser;
  children: React.ReactNode;
}) {
  return (
    <SessionProvider user={user}>
      <Inner surface={surface}>{children}</Inner>
    </SessionProvider>
  );
}

function Inner({
  surface,
  children,
}: {
  surface: "admin" | "teacher" | "parent";
  children: React.ReactNode;
}) {
  const badges = useBadgeCounts(surface);

  if (surface === "admin") {
    return (
      <AppShell
        brandLabel="Admin"
        homeHref="/admin"
        nav={ADMIN_NAV}
        badges={badges}
        settingsHref="/admin/settings"
        sidebarHeader={<BranchSwitcher />}
        wide
      >
        {children}
      </AppShell>
    );
  }

  if (surface === "teacher") {
    return (
      <AppShell
        brandLabel="Teacher"
        homeHref="/teacher"
        nav={TEACHER_NAV}
        badges={badges}
        sidebarHeader={<ClassSwitcher />}
      >
        {children}
      </AppShell>
    );
  }

  return (
    <AppShell
      brandLabel="Parent"
      homeHref="/parent"
      nav={PARENT_NAV}
      tabs={PARENT_TABS}
      badges={badges}
      accountHref="/parent/profile"
      settingsHref="/parent/settings"
      sidebarHeader={<ChildSwitcher />}
    >
      {children}
    </AppShell>
  );
}
