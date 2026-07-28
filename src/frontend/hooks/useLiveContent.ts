"use client";

import { useErpStore, type ErpStore } from "@/frontend/store/erpStore";
import { useHydrated } from "./useHydrated";

/**
 * Public marketing pages are server-rendered from `@/shared/fixtures` so crawlers
 * and first paint get real HTML. This hook then swaps in whatever the CMS store
 * holds once the client hydrates, so an admin edit in /admin/cms/blog shows up on
 * /blog without giving up SSR.
 *
 * The store is seeded from those same fixtures, so the swap is invisible unless
 * something was actually edited.
 */
export function useLiveContent<T>(initial: T, pick: (state: ErpStore) => T): T {
  const hydrated = useHydrated();
  const live = useErpStore(pick);
  return hydrated ? live : initial;
}
