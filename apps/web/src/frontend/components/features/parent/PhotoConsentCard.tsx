"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { getPhotoConsent, setPhotoConsent, type PhotoConsentState } from "@/frontend/api/erp";
import { apiEnabled } from "@/frontend/api/client";
import { useSelectedChild } from "@/frontend/hooks/useSelection";
import { SectionCard } from "@/frontend/components/ui/Bits";
import { SwitchField } from "@/frontend/components/ui/Field";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/frontend/utils/formatters";

/**
 * May the school photograph this child?
 *
 * The one consent this product can actually honour, and therefore the only one
 * on this screen: the server refuses to publish a photographed post naming a
 * child with no consent on file. Turning this off does not hide posts that
 * already exist — it stops new ones being taken with that child in them, which
 * is a different promise and is the one made here in words.
 *
 * Nothing is recorded until the server says so. A consent screen that
 * optimistically shows "off" while the record still says "on" is the one place
 * optimism is indefensible.
 */
export function PhotoConsentCard() {
  const { kids } = useSelectedChild();
  const [state, setState] = useState<Record<string, PhotoConsentState>>({});
  const [busy, setBusy] = useState<string | null>(null);
  // Nothing to load without a server (the demo store), so say so up front
  // rather than having an effect correct it a render later.
  const [loading, setLoading] = useState(apiEnabled());

  // Keyed on the ids rather than the array so a re-render with the same
  // children does not refetch.
  const childIds = kids.map((k) => k.id).join(",");

  useEffect(() => {
    if (!apiEnabled() || childIds.length === 0) return;
    let cancelled = false;
    Promise.all(childIds.split(",").map((id) => getPhotoConsent(id)))
      .then((rows) => {
        if (!cancelled) setState(Object.fromEntries(rows.map((r) => [r.studentId, r])));
      })
      .catch(() => {
        // Left empty rather than assumed: an unknown answer must never render
        // as "yes, photograph my child".
        if (!cancelled) setState({});
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [childIds]);

  async function change(studentId: string, allowed: boolean) {
    setBusy(studentId);
    try {
      const saved = await setPhotoConsent(studentId, allowed);
      setState((s) => ({ ...s, [studentId]: saved }));
      toast.success(allowed ? "Photographs allowed" : "Photographs refused — no new posts will include them");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save that");
    } finally {
      setBusy(null);
    }
  }

  return (
    <SectionCard
      title="Photographs of your child"
      icon={<Lock className="h-4 w-4" />}
      description="Whether the school may include your child in photographs posted to the class feed."
    >
      {loading ? (
        <Skeleton className="h-16 w-full" />
      ) : kids.length === 0 ? (
        <p className="text-sm text-muted-foreground">No child is linked to this account.</p>
      ) : (
        <div className="space-y-3">
          {kids.map((child) => {
            const consent = state[child.id];
            return (
              <div key={child.id} className="rounded-xl border p-3">
                <SwitchField
                  label={`${child.firstName} ${child.lastName}`}
                  description={
                    consent?.recorded
                      ? `Recorded by ${consent.decidedByName || "the office"}${
                          consent.decidedAt ? ` on ${formatDate(consent.decidedAt)}` : ""
                        }`
                      : "Nothing on file yet — until you answer, your child is left out of photographed posts"
                  }
                  checked={consent?.allowed ?? false}
                  disabled={busy === child.id}
                  onChange={(v) => void change(child.id, v)}
                />
              </div>
            );
          })}
          <p className="text-xs text-muted-foreground">
            Turning this off stops new posts including your child. Posts already published stay as
            they are — ask the office if you would like one taken down.
          </p>
        </div>
      )}
    </SectionCard>
  );
}
