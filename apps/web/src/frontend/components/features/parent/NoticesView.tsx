"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckCheck, Download, Megaphone, Paperclip, Pin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useErpStore } from "@/frontend/store/erpStore";
import { useSession } from "@/frontend/store/session";
import { useSelectedChild } from "@/frontend/hooks/useSelection";
import { noticesFor } from "@/frontend/store/queries";
import { PageHeader } from "@/frontend/components/ui/PageHeader";
import { StatusBadge } from "@/frontend/components/ui/StatusBadge";
import { DetailDialog } from "@/frontend/components/ui/FormDialog";
import { EmptyState } from "@/frontend/components/ui/EmptyState";
import type { Notice } from "@/shared/types/engagement.types";
import { formatDate, timeAgo } from "@/frontend/utils/formatters";
import { cn } from "@/lib/utils";

export function NoticesView() {
  const session = useSession();
  const { child } = useSelectedChild();
  const notices = useErpStore((s) => s.notices);
  const classrooms = useErpStore((s) => s.classrooms);
  const markRead = useErpStore((s) => s.markNoticeRead);

  const [open, setOpen] = useState<Notice | null>(null);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const classroomIds = child?.classroomId ? [child.classroomId] : [];
  const all = noticesFor(notices, "PARENTS", classroomIds);
  const unread = all.filter((n) => !n.readBy.includes(session.id));
  const shown = filter === "unread" ? unread : all;

  function openNotice(n: Notice) {
    setOpen(n);
    if (!n.readBy.includes(session.id)) markRead(n.id, session.id);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Notice board"
        description="Circulars and announcements from the school."
        crumbs={[{ label: "Parent", href: "/parent" }, { label: "Notices" }]}
        actions={
          unread.length > 0 && (
            <Button
              variant="outline"
              onClick={() => {
                unread.forEach((n) => markRead(n.id, session.id));
                toast.success("All notices marked read");
              }}
            >
              <CheckCheck /> Mark all read
            </Button>
          )
        }
      />

      <div className="flex flex-wrap gap-1.5">
        {(
          [
            ["all", `All (${all.length})`],
            ["unread", `Unread (${unread.length})`],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold transition",
              filter === value ? "bg-ck-red text-white" : "bg-muted text-muted-foreground hover:bg-muted/70",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <EmptyState
          emoji="📭"
          title={filter === "unread" ? "You're all caught up" : "No notices yet"}
          description={filter === "unread" ? "Every notice has been read." : "School circulars will appear here."}
        />
      ) : (
        <ul className="space-y-3">
          {shown.map((n) => {
            const isUnread = !n.readBy.includes(session.id);
            return (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => openNotice(n)}
                  className={cn(
                    "w-full rounded-2xl border bg-card p-4 text-left transition hover:border-ck-red/40",
                    isUnread && "border-ck-red/30 bg-ck-red/[0.03]",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 font-heading text-base font-semibold">
                        {n.pinned && <Pin className="h-3.5 w-3.5 shrink-0 text-ck-orange" />}
                        {n.title}
                        {isUnread && <span className="h-2 w-2 shrink-0 rounded-full bg-ck-red" />}
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{n.body}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <StatusBadge status={n.priority} />
                      <span className="text-[10px] text-muted-foreground">
                        {n.publishedAt ? timeAgo(n.publishedAt) : ""}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{n.authorName}</span>
                    {n.classroomId && (
                      <Badge variant="outline" className="text-[10px]">
                        {classrooms.find((c) => c.id === n.classroomId)?.name}
                      </Badge>
                    )}
                    {n.attachments.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Paperclip className="h-3 w-3" /> {n.attachments.length}
                      </span>
                    )}
                    {n.expiresAt && <span>· until {formatDate(n.expiresAt)}</span>}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <DetailDialog
        open={!!open}
        onOpenChange={(o) => !o && setOpen(null)}
        title={open?.title ?? ""}
        description={open ? `${open.authorName} · ${open.publishedAt ? formatDate(open.publishedAt) : ""}` : undefined}
        size="lg"
        footer={
          <Button variant="outline" onClick={() => setOpen(null)}>
            Close
          </Button>
        }
      >
        {open && (
          <>
            <div className="flex flex-wrap gap-1.5">
              <StatusBadge status={open.priority} />
              {open.pinned && <Badge variant="secondary">Pinned</Badge>}
              <Badge variant="outline">
                <Megaphone className="mr-1 h-3 w-3" />
                {open.audience === "CLASSROOM"
                  ? (classrooms.find((c) => c.id === open.classroomId)?.name ?? "Classroom")
                  : "All parents"}
              </Badge>
            </div>
            <div className="space-y-2 text-sm">
              {open.body.split("\n").map((para, i) =>
                para.trim() ? <p key={i}>{para}</p> : <span key={i} className="block h-1" />,
              )}
            </div>
            {open.attachments.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-bold tracking-wide text-muted-foreground uppercase">Attachments</p>
                <ul className="space-y-1.5">
                  {open.attachments.map((a) => (
                    <li key={a.id}>
                      <button
                        type="button"
                        onClick={() => toast.success(`Downloading ${a.caption ?? "attachment"}…`)}
                        className="flex w-full items-center justify-between gap-2 rounded-lg border p-2.5 text-sm transition hover:bg-muted"
                      >
                        <span className="flex items-center gap-2">
                          <span aria-hidden>{a.placeholder ?? "📄"}</span>
                          {a.caption ?? "Attachment"}
                        </span>
                        <Download className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </DetailDialog>
    </div>
  );
}
