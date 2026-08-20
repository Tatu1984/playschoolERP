"use client";

import { useErpStore, type ErpStore } from "@/frontend/store/erpStore";

/**
 * Public marketing pages are server-rendered from the database, so `initial` is
 * already the real thing — this hook only matters inside the portal, where an
 * admin editing a post in /admin/cms/blog should see /blog change without a
 * round trip.
 *
 * The gate is the *store's* hydration, not React's: on a public page the store
 * never loads a snapshot, so `initial` is what renders and keeps rendering.
 */
export function useLiveContent<T>(initial: T, pick: (state: ErpStore) => T): T {
  const hydrated = useErpStore((s) => s.hydrated);
  const live = useErpStore(pick);
  return hydrated ? live : initial;
}
