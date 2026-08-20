"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy, Eye, Megaphone, Pencil, Pin, PinOff, Plus, Send, Trash2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useErpStore } from "@/frontend/store/erpStore";
import { useSession } from "@/frontend/store/session";
import { PageHeader } from "@/frontend/components/ui/PageHeader";
import { KpiCard } from "@/frontend/components/ui/KpiCard";
import { DataTable, type Column } from "@/frontend/components/ui/DataTable";
import { ConfirmDialog, DetailDialog, FormDialog } from "@/frontend/components/ui/FormDialog";
import { SelectField, TextField, TextareaField } from "@/frontend/components/ui/Field";
import { StatusBadge } from "@/frontend/components/ui/StatusBadge";
import type { Notice } from "@/shared/types/engagement.types";
import { newId, titleCase } from "@/shared/utils/common.util";
import { dateKey, nowIso } from "@/shared/utils/date.util";
import { formatDate, timeAgo } from "@/frontend/utils/formatters";

interface Draft {
  title: string;
  body: string;
  audience: Notice["audience"];
  classroomId: string;
  priority: Notice["priority"];
  expiresAt: string;
  pinned: boolean;
  publishNow: boolean;
}

const EMPTY: Draft = {
  title: "",
  body: "",
  audience: "PARENTS",
  classroomId: "",
  priority: "NORMAL",
  expiresAt: "",
  pinned: false,
  publishNow: true,
};

export function NoticesManager() {
  const session = useSession();
  const notices = useErpStore((s) => s.notices);
  const classrooms = useErpStore((s) => s.classrooms);
  const guardians = useErpStore((s) => s.guardians);
  const addItem = useErpStore((s) => s.addItem);
  const patchItem = useErpStore((s) => s.patchItem);
  const removeItem = useErpStore((s) => s.removeItem);
  const publishNotice = useErpStore((s) => s.publishNotice);

  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [editing, setEditing] = useState<Notice | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [viewing, setViewing] = useState<Notice | null>(null);
  const [deleting, setDeleting] = useState<Notice | null>(null);

  function set<K extends keyof Draft>(k: K, v: Draft[K]) {
    setDraft((d) => ({ ...d, [k]: v }));
  }

  function openCreate() {
    setEditing(null);
    setDraft(EMPTY);
    setFormOpen(true);
  }

  function openEdit(n: Notice) {
    setEditing(n);
    setDraft({
      title: n.title,
      body: n.body,
      audience: n.audience,
      classroomId: n.classroomId ?? "",
      priority: n.priority,
      expiresAt: n.expiresAt ? dateKey(n.expiresAt) : "",
      pinned: n.pinned,
      publishNow: !!n.publishedAt,
    });
    setFormOpen(true);
  }

  function save(): boolean {
    if (!draft.title.trim() || !draft.body.trim()) {
      toast.error("Title and message are required");
      return false;
    }
    const payload = {
      title: draft.title.trim(),
      body: draft.body,
      audience: draft.audience,
      classroomId: draft.audience === "CLASSROOM" ? draft.classroomId || null : null,
      priority: draft.priority,
      expiresAt: draft.expiresAt ? new Date(draft.expiresAt).toISOString() : null,
      pinned: draft.pinned,
      publishedAt: draft.publishNow ? (editing?.publishedAt ?? nowIso()) : null,
    };
    if (editing) {
      patchItem("notices", editing.id, payload);
      toast.success("Notice updated");
    } else {
      addItem("notices", {
        id: newId("not"),
        ...payload,
        branchId: null,
        authorName: session.name,
        attachments: [],
        readBy: [],
        createdAt: nowIso(),
      });
      toast.success(draft.publishNow ? "Notice published" : "Draft saved");
    }
    return true;
  }

  const audienceSize = (n: Notice) =>
    n.audience === "CLASSROOM" ? 6 : n.audience === "STAFF" ? 10 : guardians.length;

  const columns: Column<Notice>[] = [
    {
      key: "title",
      header: "Notice",
      sortValue: (n) => n.title,
      cell: (n) => (
        <div className="flex min-w-0 items-start gap-2">
          {n.pinned && <Pin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ck-orange" />}
          <div className="min-w-0">
            <p className="truncate font-medium">{n.title}</p>
            <p className="truncate text-xs text-muted-foreground">{n.body.split("\n")[0]}</p>
          </div>
        </div>
      ),
    },
    {
      key: "audience",
      header: "Audience",
      hideOnMobile: true,
      sortValue: (n) => n.audience,
      cell: (n) => (
        <div>
          <Badge variant="outline">{titleCase(n.audience)}</Badge>
          {n.classroomId && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {classrooms.find((c) => c.id === n.classroomId)?.name}
            </p>
          )}
        </div>
      ),
    },
    { key: "priority", header: "Priority", sortValue: (n) => n.priority, cell: (n) => <StatusBadge status={n.priority} /> },
    {
      key: "reads",
      header: "Read",
      hideOnMobile: true,
      sortValue: (n) => n.readBy.length,
      cell: (n) => (
        <span className="text-sm tabular-nums">
          {n.readBy.length}/{audienceSize(n)}
        </span>
      ),
    },
    {
      key: "published",
      header: "Published",
      sortValue: (n) => n.publishedAt ?? "",
      cell: (n) =>
        n.publishedAt ? (
          <span className="text-sm">{timeAgo(n.publishedAt)}</span>
        ) : (
          <StatusBadge status="DRAFT" />
        ),
    },
  ];

  const published = notices.filter((n) => n.publishedAt);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Notices"
        description="Circulars and announcements. Published notices appear instantly in the parent and teacher portals."
        crumbs={[{ label: "Admin", href: "/admin" }, { label: "Notices" }]}
        actions={
          <Button onClick={openCreate}>
            <Plus /> New notice
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Published" value={published.length} accent="green" icon={<Megaphone className="h-4 w-4" />} />
        <KpiCard label="Drafts" value={notices.length - published.length} accent="muted" />
        <KpiCard label="Pinned" value={notices.filter((n) => n.pinned).length} accent="orange" />
        <KpiCard label="Urgent" value={notices.filter((n) => n.priority === "URGENT").length} accent="brand" />
      </div>

      <DataTable
        rows={notices}
        columns={columns}
        rowId={(n) => n.id}
        searchable={(n) => `${n.title} ${n.body} ${n.authorName}`}
        searchPlaceholder="Search notices…"
        onRowClick={setViewing}
        filters={[
          {
            key: "audience",
            label: "Audience",
            options: ["ALL", "PARENTS", "STAFF", "CLASSROOM"].map((a) => ({ value: a, label: titleCase(a) })),
            predicate: (n, v) => n.audience === v,
          },
          {
            key: "state",
            label: "State",
            options: [
              { value: "published", label: "Published" },
              { value: "draft", label: "Draft" },
            ],
            predicate: (n, v) => (v === "published" ? !!n.publishedAt : !n.publishedAt),
          },
        ]}
        rowActions={(n) => [
          { label: "Preview", icon: <Eye />, onSelect: () => setViewing(n) },
          { label: "Edit", icon: <Pencil />, onSelect: () => openEdit(n) },
          n.publishedAt
            ? {
                label: "Unpublish",
                icon: <Undo2 />,
                onSelect: () => {
                  publishNotice(n.id, false);
                  toast.success("Moved back to drafts");
                },
              }
            : {
                label: "Publish now",
                icon: <Send />,
                onSelect: () => {
                  publishNotice(n.id, true);
                  toast.success("Notice published");
                },
              },
          {
            label: n.pinned ? "Unpin" : "Pin to top",
            icon: n.pinned ? <PinOff /> : <Pin />,
            onSelect: () => {
              patchItem("notices", n.id, { pinned: !n.pinned });
              toast.success(n.pinned ? "Unpinned" : "Pinned");
            },
          },
          {
            label: "Duplicate",
            icon: <Copy />,
            onSelect: () => {
              addItem("notices", {
                ...n,
                id: newId("not"),
                title: `${n.title} (copy)`,
                publishedAt: null,
                readBy: [],
                pinned: false,
                createdAt: nowIso(),
              });
              toast.success("Duplicated as draft");
            },
          },
          { label: "Delete", icon: <Trash2 />, destructive: true, onSelect: () => setDeleting(n) },
        ]}
        bulkActions={(ids, clear) => (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                ids.forEach((id) => publishNotice(id, true));
                toast.success(`${ids.length} notices published`);
                clear();
              }}
            >
              <Send /> Publish
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                ids.forEach((id) => removeItem("notices", id));
                toast.success(`${ids.length} deleted`);
                clear();
              }}
            >
              Delete
            </Button>
          </>
        )}
        emptyTitle="No notices"
        emptyEmoji="📢"
        emptyAction={<Button onClick={openCreate}>New notice</Button>}
      />

      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? "Edit notice" : "New notice"}
        submitLabel={editing ? "Save" : draft.publishNow ? "Publish" : "Save draft"}
        onSubmit={save}
        size="lg"
      >
        <TextField label="Title" required value={draft.title} onChange={(v) => set("title", v)} placeholder="Annual Day — 15 August, 5 PM" />
        <TextareaField
          label="Message"
          required
          rows={6}
          value={draft.body}
          onChange={(v) => set("body", v)}
          placeholder="Write the circular. Blank lines become paragraphs."
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            label="Audience"
            value={draft.audience}
            onChange={(v) => set("audience", v as Notice["audience"])}
            options={[
              { value: "ALL", label: "Everyone" },
              { value: "PARENTS", label: "All parents" },
              { value: "STAFF", label: "Staff only" },
              { value: "CLASSROOM", label: "One classroom" },
            ]}
          />
          {draft.audience === "CLASSROOM" && (
            <SelectField
              label="Classroom"
              value={draft.classroomId}
              onChange={(v) => set("classroomId", v)}
              options={classrooms.map((c) => ({ value: c.id, label: c.name }))}
              placeholder="Pick a classroom"
            />
          )}
          <SelectField
            label="Priority"
            value={draft.priority}
            onChange={(v) => set("priority", v as Notice["priority"])}
            options={[
              { value: "NORMAL", label: "Normal" },
              { value: "IMPORTANT", label: "Important" },
              { value: "URGENT", label: "Urgent (push + SMS)" },
            ]}
          />
          <TextField label="Expires on" type="date" value={draft.expiresAt} onChange={(v) => set("expiresAt", v)} hint="Optional — hides it afterwards" />
        </div>
        <div className="flex flex-wrap gap-4 rounded-xl border p-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={draft.pinned} onChange={(e) => set("pinned", e.target.checked)} />
            Pin to top
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={draft.publishNow} onChange={(e) => set("publishNow", e.target.checked)} />
            Publish immediately
          </label>
        </div>
      </FormDialog>

      <DetailDialog
        open={!!viewing}
        onOpenChange={(o) => !o && setViewing(null)}
        title={viewing?.title ?? ""}
        description={
          viewing
            ? `${viewing.authorName} · ${viewing.publishedAt ? formatDate(viewing.publishedAt) : "draft"}`
            : undefined
        }
        footer={
          viewing && (
            <>
              <Button variant="outline" onClick={() => setViewing(null)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  const n = viewing;
                  setViewing(null);
                  openEdit(n);
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
            <div className="flex flex-wrap gap-1.5">
              <StatusBadge status={viewing.priority} />
              <Badge variant="outline">{titleCase(viewing.audience)}</Badge>
              {viewing.pinned && <Badge variant="secondary">Pinned</Badge>}
            </div>
            <div className="space-y-2 text-sm">
              {viewing.body.split("\n").map((para, i) =>
                para.trim() ? (
                  <p key={i}>{para}</p>
                ) : (
                  <span key={i} className="block h-1" />
                ),
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Read by {viewing.readBy.length} of {audienceSize(viewing)} recipients
              {viewing.expiresAt ? ` · expires ${formatDate(viewing.expiresAt)}` : ""}
            </p>
          </>
        )}
      </DetailDialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete this notice?"
        description="It disappears from every portal immediately."
        confirmLabel="Delete"
        onConfirm={() => {
          if (!deleting) return;
          removeItem("notices", deleting.id);
          toast.success("Notice deleted");
          setDeleting(null);
        }}
      />
    </div>
  );
}
