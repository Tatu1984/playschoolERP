"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CalendarDays, Copy, Eye, Pencil, Plus, Send, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useErpStore } from "@/frontend/store/erpStore";
import { useBranchScope } from "@/frontend/hooks/useSelection";
import { upcomingEvents } from "@/frontend/store/queries";
import { PageHeader } from "@/frontend/components/ui/PageHeader";
import { KpiCard } from "@/frontend/components/ui/KpiCard";
import { DataTable, type Column } from "@/frontend/components/ui/DataTable";
import { ConfirmDialog, DetailDialog, DetailRow, FormDialog } from "@/frontend/components/ui/FormDialog";
import { SelectField, TextField, TextareaField } from "@/frontend/components/ui/Field";
import type { EventKind, SchoolEvent } from "@/shared/types/engagement.types";
import { newId, slugify, sum, titleCase } from "@/shared/utils/common.util";
import { nowIso } from "@/shared/utils/date.util";
import { formatDateTime, relativeDays } from "@/frontend/utils/formatters";

const KINDS: EventKind[] = ["CELEBRATION", "SPORTS", "WORKSHOP", "PTM", "HOLIDAY", "TRIP", "COMPETITION"];

const KIND_EMOJI: Record<EventKind, string> = {
  CELEBRATION: "🎭",
  SPORTS: "🏃",
  WORKSHOP: "🧑‍🏫",
  PTM: "🗣️",
  HOLIDAY: "🏖️",
  TRIP: "🚌",
  COMPETITION: "🏆",
};

interface Draft {
  title: string;
  description: string;
  kind: EventKind;
  startsAt: string;
  endsAt: string;
  venue: string;
  branchId: string;
  rsvpEnabled: boolean;
  published: boolean;
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => `${n}`.padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EventsManager() {
  const { branches, inScope } = useBranchScope();
  const events = useErpStore((s) => s.events);
  const addItem = useErpStore((s) => s.addItem);
  const patchItem = useErpStore((s) => s.patchItem);
  const removeItem = useErpStore((s) => s.removeItem);

  const rows = inScope(events);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SchoolEvent | null>(null);
  const [viewing, setViewing] = useState<SchoolEvent | null>(null);
  const [deleting, setDeleting] = useState<SchoolEvent | null>(null);
  const [draft, setDraft] = useState<Draft>({
    title: "",
    description: "",
    kind: "CELEBRATION",
    startsAt: "",
    endsAt: "",
    venue: "",
    branchId: "",
    rsvpEnabled: true,
    published: true,
  });

  function set<K extends keyof Draft>(k: K, v: Draft[K]) {
    setDraft((d) => ({ ...d, [k]: v }));
  }

  function openCreate() {
    setEditing(null);
    setDraft({
      title: "",
      description: "",
      kind: "CELEBRATION",
      startsAt: "",
      endsAt: "",
      venue: "",
      branchId: "",
      rsvpEnabled: true,
      published: true,
    });
    setFormOpen(true);
  }

  function openEdit(e: SchoolEvent) {
    setEditing(e);
    setDraft({
      title: e.title,
      description: e.description,
      kind: e.kind,
      startsAt: toLocalInput(e.startsAt),
      endsAt: toLocalInput(e.endsAt),
      venue: e.venue,
      branchId: e.branchId ?? "",
      rsvpEnabled: e.rsvpEnabled,
      published: e.published,
    });
    setFormOpen(true);
  }

  function save(): boolean {
    if (!draft.title.trim() || !draft.startsAt) {
      toast.error("Title and start time are required");
      return false;
    }
    const payload = {
      title: draft.title.trim(),
      description: draft.description,
      kind: draft.kind,
      startsAt: new Date(draft.startsAt).toISOString(),
      endsAt: new Date(draft.endsAt || draft.startsAt).toISOString(),
      venue: draft.venue,
      branchId: draft.branchId || null,
      rsvpEnabled: draft.rsvpEnabled,
      published: draft.published,
      coverEmoji: KIND_EMOJI[draft.kind],
    };
    if (editing) {
      patchItem("events", editing.id, payload);
      toast.success("Event updated");
    } else {
      addItem("events", {
        id: newId("ev"),
        slug: slugify(draft.title),
        ...payload,
        media: [],
        rsvps: [],
        createdAt: nowIso(),
      });
      toast.success(draft.published ? "Event published" : "Draft saved");
    }
    return true;
  }

  const columns: Column<SchoolEvent>[] = [
    {
      key: "event",
      header: "Event",
      sortValue: (e) => e.title,
      cell: (e) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="text-xl" aria-hidden>
            {e.coverEmoji}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium">{e.title}</p>
            <p className="truncate text-xs text-muted-foreground">{e.venue}</p>
          </div>
        </div>
      ),
    },
    { key: "kind", header: "Type", hideOnMobile: true, sortValue: (e) => e.kind, cell: (e) => <Badge variant="outline">{titleCase(e.kind)}</Badge> },
    {
      key: "when",
      header: "When",
      sortValue: (e) => e.startsAt,
      cell: (e) => (
        <div>
          <p className="text-sm">{formatDateTime(e.startsAt)}</p>
          <p className="text-xs text-muted-foreground">{relativeDays(e.startsAt)}</p>
        </div>
      ),
    },
    {
      key: "rsvp",
      header: "RSVPs",
      hideOnMobile: true,
      sortValue: (e) => e.rsvps.length,
      cell: (e) =>
        e.rsvpEnabled ? (
          <span className="text-sm tabular-nums">
            {e.rsvps.length} · {sum(e.rsvps.map((r) => r.guests))} guests
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">off</span>
        ),
    },
    {
      key: "state",
      header: "State",
      sortValue: (e) => (e.published ? "PUBLISHED" : "DRAFT"),
      cell: (e) => (e.published ? <Badge variant="secondary">Published</Badge> : <Badge variant="outline">Draft</Badge>),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Events"
        description="Calendar, RSVPs and post-event galleries. Published events show on the website and in the parent app."
        crumbs={[{ label: "Admin", href: "/admin" }, { label: "Events" }]}
        actions={
          <Button onClick={openCreate}>
            <Plus /> New event
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Upcoming" value={upcomingEvents(rows).length} accent="magenta" icon={<CalendarDays className="h-4 w-4" />} />
        <KpiCard label="Total RSVPs" value={sum(rows.map((e) => e.rsvps.length))} accent="green" icon={<Users className="h-4 w-4" />} />
        <KpiCard label="Guests expected" value={sum(rows.flatMap((e) => e.rsvps.map((r) => r.guests)))} accent="blue" />
        <KpiCard label="Drafts" value={rows.filter((e) => !e.published).length} accent="muted" />
      </div>

      <DataTable
        rows={rows}
        columns={columns}
        rowId={(e) => e.id}
        searchable={(e) => `${e.title} ${e.venue} ${e.description}`}
        searchPlaceholder="Search events…"
        exportName="events"
        onRowClick={setViewing}
        filters={[
          { key: "kind", label: "Type", options: KINDS.map((k) => ({ value: k, label: titleCase(k) })), predicate: (e, v) => e.kind === v },
          {
            key: "state",
            label: "State",
            options: [
              { value: "published", label: "Published" },
              { value: "draft", label: "Draft" },
            ],
            predicate: (e, v) => (v === "published" ? e.published : !e.published),
          },
        ]}
        rowActions={(e) => [
          { label: "View details", icon: <Eye />, onSelect: () => setViewing(e) },
          { label: "Edit", icon: <Pencil />, onSelect: () => openEdit(e) },
          {
            label: e.published ? "Unpublish" : "Publish",
            icon: <Send />,
            onSelect: () => {
              patchItem("events", e.id, { published: !e.published });
              toast.success(e.published ? "Unpublished" : "Published");
            },
          },
          {
            label: e.rsvpEnabled ? "Close RSVPs" : "Open RSVPs",
            onSelect: () => {
              patchItem("events", e.id, { rsvpEnabled: !e.rsvpEnabled });
              toast.success(e.rsvpEnabled ? "RSVPs closed" : "RSVPs open");
            },
          },
          {
            label: "Notify parents",
            onSelect: () => toast.success(`Push sent for “${e.title}”`),
          },
          {
            label: "Duplicate",
            icon: <Copy />,
            separatorBefore: true,
            onSelect: () => {
              addItem("events", {
                ...e,
                id: newId("ev"),
                slug: `${e.slug}-copy`,
                title: `${e.title} (copy)`,
                published: false,
                rsvps: [],
                createdAt: nowIso(),
              });
              toast.success("Duplicated as draft");
            },
          },
          { label: "Delete", icon: <Trash2 />, destructive: true, onSelect: () => setDeleting(e) },
        ]}
        emptyTitle="No events"
        emptyEmoji="🎪"
        emptyAction={<Button onClick={openCreate}>New event</Button>}
      />

      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? "Edit event" : "New event"}
        submitLabel={editing ? "Save" : "Create"}
        onSubmit={save}
        size="lg"
      >
        <TextField label="Title" required value={draft.title} onChange={(v) => set("title", v)} placeholder="Annual Day — Little Big Show" />
        <TextareaField label="Description" rows={4} value={draft.description} onChange={(v) => set("description", v)} />
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            label="Type"
            value={draft.kind}
            onChange={(v) => set("kind", v as EventKind)}
            options={KINDS.map((k) => ({ value: k, label: `${KIND_EMOJI[k]} ${titleCase(k)}` }))}
          />
          <TextField label="Venue" value={draft.venue} onChange={(v) => set("venue", v)} placeholder="Kathgola Community Hall" />
          <TextField label="Starts" required type="datetime-local" value={draft.startsAt} onChange={(v) => set("startsAt", v)} />
          <TextField label="Ends" type="datetime-local" value={draft.endsAt} onChange={(v) => set("endsAt", v)} />
          <SelectField
            label="Branch"
            value={draft.branchId}
            onChange={(v) => set("branchId", v)}
            options={branches.map((b) => ({ value: b.id, label: b.name }))}
            placeholder="All branches"
          />
        </div>
        <div className="flex flex-wrap gap-4 rounded-xl border p-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={draft.rsvpEnabled} onChange={(e) => set("rsvpEnabled", e.target.checked)} />
            Collect RSVPs
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={draft.published} onChange={(e) => set("published", e.target.checked)} />
            Publish immediately
          </label>
        </div>
      </FormDialog>

      <DetailDialog
        open={!!viewing}
        onOpenChange={(o) => !o && setViewing(null)}
        title={viewing ? `${viewing.coverEmoji} ${viewing.title}` : ""}
        description={viewing ? formatDateTime(viewing.startsAt) : undefined}
        footer={
          viewing && (
            <>
              <Button variant="outline" onClick={() => setViewing(null)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  const e = viewing;
                  setViewing(null);
                  openEdit(e);
                }}
              >
                <Pencil /> Edit
              </Button>
            </>
          )
        }
      >
        {viewing && (
          <>
            <p className="text-sm">{viewing.description}</p>
            <div>
              <DetailRow label="Type">{titleCase(viewing.kind)}</DetailRow>
              <DetailRow label="Venue">{viewing.venue || "—"}</DetailRow>
              <DetailRow label="Branch">
                {viewing.branchId ? branches.find((b) => b.id === viewing.branchId)?.name : "All branches"}
              </DetailRow>
              <DetailRow label="Ends">{formatDateTime(viewing.endsAt)}</DetailRow>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-bold tracking-wide text-muted-foreground uppercase">
                RSVPs ({viewing.rsvps.length})
              </p>
              {viewing.rsvps.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nobody has responded yet.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {viewing.rsvps.map((r) => (
                    <li key={r.userId} className="flex justify-between">
                      <span>{r.name}</span>
                      <span className="text-muted-foreground">{r.guests} guests</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </DetailDialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete “${deleting?.title}”?`}
        description="RSVPs and the event gallery are removed too."
        confirmLabel="Delete event"
        onConfirm={() => {
          if (!deleting) return;
          removeItem("events", deleting.id);
          toast.success("Event deleted");
          setDeleting(null);
        }}
      />
    </div>
  );
}
