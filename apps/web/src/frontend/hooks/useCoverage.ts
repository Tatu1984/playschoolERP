"use client";

import { useErpStore, type SnapshotCoverage } from "@/frontend/store/erpStore";

export interface CoverageFor {
  /** True when this collection stops at `since` rather than going back for ever. */
  windowed: boolean;
  /** True when it also hit a row cap, so it is the newest N of the window. */
  truncated: boolean;
  since: Date | null;
  days: number;
}

/**
 * How far back the data on screen actually goes.
 *
 * The portal loads a term, not a school's whole history — 120 days, with caps.
 * That is the right trade for a single bootstrap call and it makes every total
 * on screen a total *within a window*. "Absent 4 times" means four times since
 * May, and a screen that renders it as though it meant four times ever is
 * wrong in a way no bug report will ever describe, because it looks fine.
 *
 * Returns nulls when there is no server behind the store (the demo fixtures),
 * where the data genuinely is everything there is.
 */
export function useCoverage(collection: string): CoverageFor {
  const coverage = useErpStore((s) => s.coverage);
  return coverageFor(coverage, collection);
}

export function coverageFor(
  coverage: SnapshotCoverage | null,
  collection: string,
): CoverageFor {
  if (!coverage) return { windowed: false, truncated: false, since: null, days: 0 };

  const since = new Date(coverage.since);
  const valid = !Number.isNaN(since.getTime());
  return {
    windowed: valid && coverage.windowed.includes(collection),
    truncated: coverage.truncated.includes(collection),
    since: valid ? since : null,
    days: valid ? Math.max(1, Math.round((Date.now() - since.getTime()) / 86_400_000)) : 0,
  };
}
