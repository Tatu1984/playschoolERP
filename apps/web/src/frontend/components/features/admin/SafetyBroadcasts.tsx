"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Siren, Send, Users, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useErpStore } from "@/frontend/store/erpStore";
import { useSession } from "@/frontend/store/session";
import { PageHeader } from "@/frontend/components/ui/PageHeader";
import { KpiCard } from "@/frontend/components/ui/KpiCard";
import { SectionCard } from "@/frontend/components/ui/Bits";
import { FormDialog, ConfirmDialog } from "@/frontend/components/ui/FormDialog";
import { SelectField, TextField, TextareaField } from "@/frontend/components/ui/Field";
import { StatusBadge } from "@/frontend/components/ui/StatusBadge";
import { EmptyState } from "@/frontend/components/ui/EmptyState";
import { formatDateTime } from "@/frontend/utils/formatters";
import type { SafetyBroadcast } from "@/shared/types/ops.types";

type BroadcastSeverity = SafetyBroadcast["severity"];

/**
 * Sending a safety broadcast, and seeing who it actually reached.
 *
 * The endpoint has existed and worked for a while; there was no screen, so a
 * head teacher's only route to an emergency broadcast was an API call. That is
 * a fine state for a feature nobody urgently needs and an absurd one for this.
 *
 * Two things this screen does that a simple form would not:
 *
 *  * **CRITICAL asks twice.** It overrides quiet hours and muted topics — it is
 *    designed to wake people at three in the morning — so sending one is a
 *    deliberate act, not a mis-click on a dropdown.
 *  * **It shows delivery, not "sent".** Every broadcast reports how many people
 *    it was for, how many were actually reached on a phone or by email, and how
 *    many have it in the portal and nowhere else. That last number is the list
 *    the office telephones. Until delivery finishes it says "sending", because
 *    that is a different fact.
 */
const SEVERITIES: { value: BroadcastSeverity; label: string; hint: string }[] = [
  { value: "INFO", label: "Information", hint: "Ordinary news. Respects quiet hours." },
  { value: "WARNING", label: "Warning", hint: "Needs attention today. Respects quiet hours." },
  {
    value: "CRITICAL",
    label: "Critical — overrides quiet hours",
    hint: "Wakes phones, ignores muted topics. For lockdowns, evacuations and missing children.",
  },
];

export function SafetyBroadcasts() {
  const broadcasts = useErpStore((s) => s.safetyBroadcasts);
  const branches = useErpStore((s) => s.branches);
  const addItem = useErpStore((s) => s.addItem);
  const session = useSession();

  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [draft, setDraft] = useState({
    title: "",
    body: "",
    severity: "INFO" as BroadcastSeverity,
    branchId: "",
  });

  const reachedTotal = broadcasts.reduce((sum, b) => sum + b.delivery.delivered, 0);
  const unreachedTotal = broadcasts.reduce((sum, b) => sum + b.delivery.unreached, 0);

  function send(): boolean {
    if (!draft.title.trim() || !draft.body.trim()) {
      toast.error("A broadcast needs a title and a message");
      return false;
    }
    if (draft.severity === "CRITICAL" && !confirming) {
      setConfirming(true);
      return false;
    }
    addItem("safetyBroadcasts", {
      id: `sb_${Date.now().toString(36)}`,
      title: draft.title.trim(),
      body: draft.body.trim(),
      severity: draft.severity,
      branchId: draft.branchId || null,
      sentByName: session?.name ?? "School office",
      acknowledgedBy: [],
      delivery: { recipients: 0, delivered: 0, unreached: 0, finishedAt: null },
      createdAt: new Date().toISOString(),
    });
    toast.success("Broadcast sent — delivery is running now");
    setDraft({ title: "", body: "", severity: "INFO", branchId: "" });
    setConfirming(false);
    setOpen(false);
    return true;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Safety broadcasts"
        description="Reaches every parent and member of staff at the chosen campus."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Siren /> New broadcast
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Sent" value={broadcasts.length} accent="navy" icon={<Send className="h-4 w-4" />} />
        <KpiCard label="People reached" value={reachedTotal} accent="green" icon={<Users className="h-4 w-4" />} />
        <KpiCard
          label="Not reached"
          value={unreachedTotal}
          accent={unreachedTotal ? "brand" : "muted"}
          sub="portal only — telephone them"
        />
        <KpiCard
          label="Acknowledged"
          value={broadcasts.reduce((s, b) => s + b.acknowledgedBy.length, 0)}
          accent="blue"
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
      </div>

      <SectionCard title="Everything sent" description="Newest first, with what actually happened to it.">
        {broadcasts.length === 0 ? (
          <EmptyState
            emoji="📣"
            title="Nothing sent yet"
            description="Broadcasts reach every parent and member of staff at the campus you choose."
          />
        ) : (
          <ul className="space-y-2.5">
            {broadcasts.map((b) => {
              const sending = b.delivery.finishedAt === null;
              return (
                <li key={b.id} className="rounded-xl border p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-sm font-semibold">
                        {b.title}
                        <StatusBadge status={b.severity} />
                      </p>
                      <p className="mt-0.5 text-sm text-muted-foreground">{b.body}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {b.sentByName} · {formatDateTime(b.createdAt)} ·{" "}
                        {b.branchId ? branches.find((x) => x.id === b.branchId)?.name ?? "one campus" : "every campus"}
                      </p>
                    </div>
                    <div className="text-right text-xs">
                      {sending ? (
                        <span className="text-muted-foreground">Sending…</span>
                      ) : (
                        <>
                          <p className="font-semibold text-ck-green-ink">
                            {b.delivery.delivered} of {b.delivery.recipients} reached
                          </p>
                          {b.delivery.unreached > 0 && (
                            <p className="mt-0.5 flex items-center gap-1 text-ck-red-ink">
                              <AlertTriangle className="h-3 w-3" aria-hidden />
                              {b.delivery.unreached} portal only
                            </p>
                          )}
                          <p className="mt-0.5 text-muted-foreground">
                            {b.acknowledgedBy.length} acknowledged
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>

      <FormDialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setConfirming(false);
        }}
        title="New safety broadcast"
        submitLabel={draft.severity === "CRITICAL" ? "Review and send" : "Send now"}
        onSubmit={send}
      >
        <TextField
          label="Title"
          required
          value={draft.title}
          onChange={(v) => setDraft({ ...draft, title: v })}
          placeholder="Gates closed — do not come to collect yet"
        />
        <TextareaField
          label="Message"
          required
          rows={4}
          value={draft.body}
          onChange={(v) => setDraft({ ...draft, body: v })}
          placeholder="Say what is happening and what you want parents to do. Short sentences."
        />
        <SelectField
          label="Severity"
          value={draft.severity}
          onChange={(v) => setDraft({ ...draft, severity: v as BroadcastSeverity })}
          options={SEVERITIES.map((s) => ({ value: s.value, label: s.label }))}
          hint={SEVERITIES.find((s) => s.value === draft.severity)?.hint}
        />
        <SelectField
          label="Who receives it"
          value={draft.branchId}
          onChange={(v) => setDraft({ ...draft, branchId: v })}
          options={[
            { value: "", label: "Every campus" },
            ...branches.map((b) => ({ value: b.id, label: b.name })),
          ]}
        />
      </FormDialog>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Send a critical broadcast?"
        description={
          "This wakes phones that have been silenced and ignores muted topics, for every parent " +
          "and member of staff at the campus you chose. Use it for lockdowns, evacuations and " +
          "missing children."
        }
        confirmLabel="Yes, send it now"
        onConfirm={() => {
          setConfirming(false);
          // `send` re-runs with `confirming` cleared, so it posts this time.
          setTimeout(() => {
            const ok = send();
            if (!ok) toast.error("Could not send — check the title and message");
          }, 0);
        }}
      />
    </div>
  );
}
