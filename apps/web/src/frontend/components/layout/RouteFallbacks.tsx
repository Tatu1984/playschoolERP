"use client";

import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/** Portal-shaped skeleton: heading, KPI row, then rows. */
export function PortalSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-80" />
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

/** Marketing-shaped skeleton: big hero then a card grid. */
export function SiteSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-16 sm:px-6" aria-busy="true">
      <Skeleton className="mx-auto h-6 w-24 rounded-full" />
      <Skeleton className="mx-auto h-14 w-3/4" />
      <Skeleton className="mx-auto h-4 w-2/3" />
      <div className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-3xl" />
        ))}
      </div>
    </div>
  );
}

/**
 * Shared error boundary body. Next passes `reset` to retry the segment without a
 * full reload; we surface the message because a silent "something went wrong" is
 * useless to whoever has to fix it.
 */
export function RouteError({
  error,
  reset,
  surface,
  homeHref,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  surface: string;
  homeHref: string;
}) {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <span className="block text-5xl" aria-hidden>
        🧯
      </span>
      <h1 className="mt-3 font-heading text-2xl font-bold">This part of {surface} hit a snag</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Nothing was lost. Try again, and if it keeps happening tell the office what you were doing.
      </p>
      <pre className="mt-4 overflow-x-auto rounded-xl bg-muted p-3 text-left text-xs text-muted-foreground">
        {error.message}
        {error.digest ? `\n\nref: ${error.digest}` : ""}
      </pre>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Button onClick={reset}>
          <RefreshCw /> Try again
        </Button>
        <Button variant="outline" asChild>
          <Link href={homeHref}>Go back</Link>
        </Button>
      </div>
    </div>
  );
}
