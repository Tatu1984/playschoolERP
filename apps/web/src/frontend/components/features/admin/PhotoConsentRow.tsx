"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Camera } from "lucide-react";
import { getPhotoConsent, setPhotoConsent, type PhotoConsentState } from "@/frontend/api/erp";
import { apiEnabled } from "@/frontend/api/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/frontend/utils/formatters";

/**
 * Photo consent, in the office's copy of a child's record.
 *
 * The parent has their own switch in the portal; this is for the answer that
 * arrives at the gate, on a form, or over the telephone. Both write the same
 * row, and the row remembers who recorded it — a consent nobody can attribute
 * is not verifiable consent, which is the whole point of writing it down.
 */
export function PhotoConsentRow({ studentId, childName }: { studentId: string; childName: string }) {
  const [consent, setConsent] = useState<PhotoConsentState | null>(null);
  // Nothing to load when there is no server (the demo store), so the initial
  // state says so rather than an effect correcting it a render later.
  const [loading, setLoading] = useState(apiEnabled());
  const [busy, setBusy] = useState(false);

  // Fetched in a promise callback rather than a function the effect calls: the
  // same shape ResetPasswordForm uses, and the one React's rules-of-hooks lint
  // accepts, because nothing sets state synchronously as the effect runs.
  useEffect(() => {
    if (!apiEnabled()) return;
    let cancelled = false;
    getPhotoConsent(studentId)
      .then((row) => {
        if (!cancelled) setConsent(row);
      })
      .catch(() => {
        // An unknown answer must never render as "yes, photograph this child".
        if (!cancelled) setConsent(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  async function record(allowed: boolean) {
    setBusy(true);
    try {
      setConsent(await setPhotoConsent(studentId, allowed, "Recorded by the office"));
      toast.success(
        allowed
          ? `${childName} may be photographed`
          : `${childName} will be left out of photographed posts`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not record that");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Skeleton className="h-14 w-full" />;

  const allowed = consent?.allowed ?? false;

  return (
    <div className="rounded-xl border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <Camera className="h-4 w-4" aria-hidden />
            Photo consent
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {consent?.recorded
              ? `${allowed ? "Given" : "Refused"} — recorded by ${consent.decidedByName || "the office"}${
                  consent.decidedAt ? ` on ${formatDate(consent.decidedAt)}` : ""
                }`
              : "Nothing on file. Until somebody answers, this child is left out of photographed posts."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant={allowed ? "default" : "outline"} disabled={busy} onClick={() => void record(true)}>
            Allowed
          </Button>
          <Button size="sm" variant={!allowed && consent?.recorded ? "destructive" : "outline"} disabled={busy} onClick={() => void record(false)}>
            Refused
          </Button>
        </div>
      </div>
    </div>
  );
}
