"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useErpStore } from "@/frontend/store/erpStore";
import { useHydrated } from "@/frontend/hooks/useHydrated";

/**
 * The single place every portal page waits for its data.
 *
 * Two waits, not one: React has to hydrate on the client (the pages are
 * client-rendered), and the store has to load this login's snapshot from
 * `/api/bootstrap`. Until both are done we show a skeleton — never the seed
 * fixtures the store starts with, because a parent glimpsing another school's
 * numbers before the real ones arrive would be worse than a moment of grey.
 *
 * If the fetch fails we say so and offer to try again, rather than rendering
 * stale or invented data as though it were the school's.
 */
export function StoreGate({
  children,
  rows = 4,
}: {
  children: React.ReactNode;
  rows?: number;
}) {
  const mounted = useHydrated();
  const hydrated = useErpStore((s) => s.hydrated);
  const loading = useErpStore((s) => s.loading);
  const lastError = useErpStore((s) => s.lastError);
  const refresh = useErpStore((s) => s.refresh);

  useEffect(() => {
    // One fetch per session, however many gated pages are mounted.
    if (!hydrated && !loading) void refresh();
  }, [hydrated, loading, refresh]);

  if (mounted && !hydrated && lastError) {
    return (
      <div className="mx-auto max-w-md py-16 text-center" role="alert">
        <AlertTriangle className="mx-auto mb-4 h-10 w-10 text-amber-500" aria-hidden />
        <h2 className="text-lg font-semibold">We couldn&apos;t load your dashboard</h2>
        <p className="mt-2 text-sm text-muted-foreground">{lastError}</p>
        <Button className="mt-6" onClick={() => void refresh()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden />
          Try again
        </Button>
      </div>
    );
  }

  if (!mounted || !hydrated) {
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
