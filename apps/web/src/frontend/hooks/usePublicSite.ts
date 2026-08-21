"use client";

import { useEffect, useState } from "react";
import type { Branch, Program } from "@/shared/types/school.types";
import type { FeeStructure } from "@/shared/types/engagement.types";

export interface PublicSiteData {
  branches: Branch[];
  programs: Program[];
  feeStructures: FeeStructure[];
}

const EMPTY: PublicSiteData = { branches: [], programs: [], feeStructures: [] };

/**
 * Campuses, programmes and fees for a form on the public site.
 *
 * Public pages have no store to read, and these components get dropped on
 * several different pages, so they ask for their own data rather than depending
 * on whichever server component happens to host them. A failure leaves the
 * lists empty and the form still submittable — a parent should not lose their
 * enquiry because a dropdown could not load.
 */
export function usePublicSite(): PublicSiteData & { loading: boolean } {
  const [data, setData] = useState<PublicSiteData>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetch("/api/public/site", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : EMPTY))
      .then((d: PublicSiteData) => {
        if (alive) setData({ ...EMPTY, ...d });
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  return { ...data, loading };
}
