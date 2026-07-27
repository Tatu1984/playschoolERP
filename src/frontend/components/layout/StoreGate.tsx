"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useHydrated } from "@/frontend/hooks/useHydrated";

/**
 * Portal pages read the persisted demo store and relative dates, so their first
 * paint must happen on the client. This renders a matching skeleton until then —
 * cheap, and it removes every hydration-mismatch class of bug in one place.
 */
export function StoreGate({
  children,
  rows = 4,
}: {
  children: React.ReactNode;
  rows?: number;
}) {
  const hydrated = useHydrated();
  if (!hydrated) {
    return (
      <div className="space-y-4" aria-busy="true" aria-live="polite">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-4 w-72" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="space-y-2">
          {Array.from({ length: rows }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
