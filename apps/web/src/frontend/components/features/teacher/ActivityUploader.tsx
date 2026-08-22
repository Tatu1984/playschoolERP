"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  Camera,
  Eye,
  Heart,
  ImagePlus,
  MessageSquare,
  Pencil,
  Plus,
  Send,
  Trash2,
  Undo2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useErpStore } from "@/frontend/store/erpStore";
import { useSession, useStaffId } from "@/frontend/store/session";
import { useSelectedClass } from "@/frontend/hooks/useSelection";
import { feedForClassrooms, rosterOf, studentName } from "@/frontend/store/queries";
import { PageHeader } from "@/frontend/components/ui/PageHeader";
import { KpiCard } from "@/frontend/components/ui/KpiCard";
import { EmojiAvatar, Tag } from "@/frontend/components/ui/Bits";
import { ConfirmDialog, DetailDialog, FormDialog } from "@/frontend/components/ui/FormDialog";
import { SelectField, TextField, TextareaField } from "@/frontend/components/ui/Field";
import { RowActions } from "@/frontend/components/ui/RowActions";
import { EmptyState } from "@/frontend/components/ui/EmptyState";
import type { Activity, ActivityKind } from "@/shared/types/engagement.types";
import type { MediaRef } from "@/shared/types/common.types";
import { newId, titleCase } from "@/shared/utils/common.util";
import { nowIso } from "@/shared/utils/date.util";
import { timeAgo } from "@/frontend/utils/formatters";
import { cn } from "@/lib/utils";
import { uploadPhoto } from "@/frontend/api/erp";

const KINDS: ActivityKind[] = ["LEARNING", "PLAY", "MEAL", "NAP", "ART", "MUSIC", "OUTDOOR", "CELEBRATION"];

const KIND_EMOJI: Record<ActivityKind, string> = {
  LEARNING: "📚",
  PLAY: "🧩",
  MEAL: "🍽️",
  NAP: "😴",
  ART: "🎨",
  MUSIC: "🎵",
  OUTDOOR: "🌳",
  CELEBRATION: "🎉",
};

interface Draft {
  kind: ActivityKind;
  title: string;
  body: string;
  studentIds: string[];
  media: MediaRef[];
  internalNote: string;
  publish: boolean;
}

export function ActivityUploader() {
  const session = useSession();
  const staffId = useStaffId();
  const { classroom } = useSelectedClass();

  const students = useErpStore((s) => s.students);
  const activities = useErpStore((s) => s.activities);
  const addItem = useErpStore((s) => s.addItem);
  const patchItem = useErpStore((s) => s.patchItem);
  const removeItem = useErpStore((s) => s.removeItem);
  const publishActivity = useErpStore((s) => s.publishActivity);
  const commentOnActivity = useErpStore((s) => s.commentOnActivity);

  const roster = classroom ? rosterOf(students, classroom.id) : [];
  const feed = classroom ? feedForClassrooms(activities, [classroom.id]) : [];

  const [composeOpen, setComposeOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState<Activity | null>(null);
  const [viewing, setViewing] = useState<Activity | null>(null);
  const [deleting, setDeleting] = useState<Activity | null>(null);
  const [reply, setReply] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const [draft, setDraft] = useState<Draft>({
    kind: "LEARNING",
    title: "",
    body: "",
    studentIds: [],
    media: [],
    internalNote: "",
    publish: true,
  });

  function resetDraft() {
    setDraft({
      kind: "LEARNING",
      title: "",
      body: "",
      studentIds: roster.map((s) => s.id),
      media: [],
      internalNote: "",
      publish: true,
    });
  }

  function openCompose() {
    setEditing(null);
    resetDraft();
    setComposeOpen(true);
  }

  function openEdit(a: Activity) {
    setEditing(a);
    setDraft({
      kind: a.kind,
      title: a.title,
      body: a.body,
      studentIds: a.studentIds,
      media: a.media,
      internalNote: a.internalNote ?? "",
      publish: a.published,
    });
    setComposeOpen(true);
  }

  /**
   * Send the photographs to the server.
   *
   * This used to read each file's *name and size*, build a MediaRef with an
   * empty `url`, and tell the teacher "3 files attached". Nothing was ever
   * uploaded — the bytes were dropped on the floor and the post went out with
   * captions pointing at nothing. A photo feed that says it has the photo and
   * does not is worse than one that admits it cannot take them.
   *
   * Now each file goes to POST /api/media, which strips its EXIF (a nursery
   * photograph carries the child's GPS position), stores it privately, and
   * returns the only URL that will ever read it back. A file that will not
   * upload is reported and is *not* attached.
   */
  async function attach(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    const attached: MediaRef[] = [];
    const failures: string[] = [];

    for (const file of Array.from(files)) {
      try {
        const media = await uploadPhoto(file, classroom?.id);
        attached.push({
          id: media.id,
          url: media.url,
          kind: media.contentType.startsWith("video") ? "video" : "image",
          caption: file.name.replace(/\.[^.]+$/, ""),
        });
      } catch (e) {
        failures.push(e instanceof Error ? e.message : file.name);
      }
    }

    setUploading(false);
    if (attached.length) {
      setDraft((d) => ({ ...d, media: [...d.media, ...attached] }));
      toast.success(`${attached.length} photo${attached.length > 1 ? "s" : ""} uploaded`);
    }
    // Named individually: "2 failed" leaves the teacher guessing which two are
    // missing from a post they are about to send to thirty families.
    for (const failure of failures.slice(0, 3)) toast.error(failure);
  }

  function save(): boolean {
    if (!draft.title.trim() || !draft.body.trim()) {
      toast.error("Give the post a title and a few words");
      return false;
    }
    if (draft.studentIds.length === 0) {
      toast.error("Tag at least one child so their parents see it");
      return false;
    }
    if (!classroom) return false;

    if (editing) {
      patchItem("activities", editing.id, {
        kind: draft.kind,
        title: draft.title.trim(),
        body: draft.body,
        studentIds: draft.studentIds,
        media: draft.media,
        internalNote: draft.internalNote,
        published: draft.publish,
      });
      toast.success("Post updated");
    } else {
      addItem("activities", {
        id: newId("act"),
        classroomId: classroom.id,
        authorStaffId: staffId,
        authorName: session.name,
        kind: draft.kind,
        title: draft.title.trim(),
        body: draft.body,
        media: draft.media,
        studentIds: draft.studentIds,
        comments: [],
        reactions: [],
        published: draft.publish,
        internalNote: draft.internalNote || undefined,
        createdAt: nowIso(),
      });
      toast.success(draft.publish ? "Posted to parents" : "Saved as draft");
    }
    return true;
  }

  const published = feed.filter((a) => a.published);
  const drafts = feed.filter((a) => !a.published);

  const card = (a: Activity) => (
    <article key={a.id} className="rounded-2xl border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <EmojiAvatar emoji={KIND_EMOJI[a.kind]} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{a.title}</p>
            <p className="truncate text-xs text-muted-foreground">
              {a.authorName} · {timeAgo(a.createdAt)} · {a.studentIds.length} tagged
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {!a.published && <Badge variant="outline">Draft</Badge>}
          <RowActions
            label="Post actions"
            actions={[
              { label: "Open", icon: <Eye />, onSelect: () => setViewing(a) },
              { label: "Edit", icon: <Pencil />, onSelect: () => openEdit(a) },
              a.published
                ? {
                    label: "Unpublish",
                    icon: <Undo2 />,
                    onSelect: () => {
                      publishActivity(a.id, false);
                      toast.success("Moved to drafts");
                    },
                  }
                : {
                    label: "Publish to parents",
                    icon: <Send />,
                    onSelect: () => {
                      publishActivity(a.id, true);
                      toast.success("Published");
                    },
                  },
              { label: "Delete", icon: <Trash2 />, destructive: true, onSelect: () => setDeleting(a) },
            ]}
          />
        </div>
      </div>

      <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{a.body}</p>

      {a.media.length > 0 && (
        <div className="mt-2 flex gap-2 overflow-x-auto">
          {a.media.map((m) => (
            <span
              key={m.id}
              className="grid h-16 w-24 shrink-0 place-items-center rounded-lg bg-muted text-2xl"
              title={m.caption}
              aria-hidden
            >
              {m.placeholder ?? "🖼️"}
            </span>
          ))}
        </div>
      )}

      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Heart className="h-3.5 w-3.5" /> {a.reactions.length}
        </span>
        <span className="flex items-center gap-1">
          <MessageSquare className="h-3.5 w-3.5" /> {a.comments.length}
        </span>
        <span className="flex items-center gap-1">
          <Users className="h-3.5 w-3.5" /> {a.studentIds.length}
        </span>
        {a.internalNote && <Tag tone="orange">internal note</Tag>}
      </div>
    </article>
  );

  if (!classroom) {
    return <EmptyState emoji="🏫" title="No class assigned" description="Ask an admin to assign you a classroom." />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Activity feed"
        description={`Photos and updates for ${classroom.name}. Published posts reach tagged children's parents instantly.`}
        crumbs={[{ label: "Teacher", href: "/teacher" }, { label: "Activities" }]}
        actions={
          <Button onClick={openCompose}>
            <Plus /> New post
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Published" value={published.length} accent="green" icon={<Camera className="h-4 w-4" />} />
        <KpiCard label="Drafts" value={drafts.length} accent="muted" />
        <KpiCard label="Hearts" value={feed.reduce((s, a) => s + a.reactions.length, 0)} accent="brand" icon={<Heart className="h-4 w-4" />} />
        <KpiCard label="Comments" value={feed.reduce((s, a) => s + a.comments.length, 0)} accent="blue" />
      </div>

      <Tabs defaultValue="published">
        <TabsList>
          <TabsTrigger value="published">Published ({published.length})</TabsTrigger>
          <TabsTrigger value="drafts">Drafts ({drafts.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="published" className="space-y-3 pt-4">
          {published.length === 0 ? (
            <EmptyState emoji="📸" title="Nothing published yet" action={<Button onClick={openCompose}>Write the first post</Button>} />
          ) : (
            published.map(card)
          )}
        </TabsContent>
        <TabsContent value="drafts" className="space-y-3 pt-4">
          {drafts.length === 0 ? <EmptyState emoji="🗒️" title="No drafts" /> : drafts.map(card)}
        </TabsContent>
      </Tabs>

      {/* composer */}
      <FormDialog
        open={composeOpen}
        onOpenChange={setComposeOpen}
        title={editing ? "Edit post" : "New activity post"}
        submitLabel={editing ? "Save" : draft.publish ? "Post" : "Save draft"}
        onSubmit={save}
        size="lg"
      >
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/*,video/*"
          hidden
          onChange={(e) => {
            void attach(e.target.files);
            e.target.value = "";
          }}
        />

        <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
          <SelectField
            label="Type"
            value={draft.kind}
            onChange={(v) => setDraft({ ...draft, kind: v as ActivityKind })}
            options={KINDS.map((k) => ({ value: k, label: `${KIND_EMOJI[k]} ${titleCase(k)}` }))}
          />
          <TextField label="Title" required value={draft.title} onChange={(v) => setDraft({ ...draft, title: v })} placeholder="Fingerprint butterflies 🦋" />
        </div>

        <TextareaField
          label="What happened"
          required
          rows={5}
          value={draft.body}
          onChange={(v) => setDraft({ ...draft, body: v })}
          placeholder="Write it the way you'd tell a parent at pickup."
        />

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">Photos &amp; video</p>
            <Button
              type="button"
              size="xs"
              variant="outline"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              <ImagePlus /> {uploading ? "Uploading…" : "Attach"}
            </Button>
          </div>
          {draft.media.length === 0 ? (
            <p className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">
              No media attached
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {draft.media.map((m) => (
                <span key={m.id} className="relative">
                  <span className="grid h-16 w-24 place-items-center rounded-lg bg-muted text-2xl" aria-hidden>
                    {m.placeholder ?? "🖼️"}
                  </span>
                  <button
                    type="button"
                    aria-label="Remove media"
                    onClick={() => setDraft({ ...draft, media: draft.media.filter((x) => x.id !== m.id) })}
                    className="absolute -top-1.5 -right-1.5 grid h-5 w-5 place-items-center rounded-full bg-ck-red text-[10px] font-bold text-white"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
              Tag children ({draft.studentIds.length}/{roster.length})
            </p>
            <div className="flex gap-1">
              <Button type="button" size="xs" variant="ghost" onClick={() => setDraft({ ...draft, studentIds: roster.map((s) => s.id) })}>
                All
              </Button>
              <Button type="button" size="xs" variant="ghost" onClick={() => setDraft({ ...draft, studentIds: [] })}>
                None
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {roster.map((s) => {
              const on = draft.studentIds.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      studentIds: on ? draft.studentIds.filter((id) => id !== s.id) : [...draft.studentIds, s.id],
                    })
                  }
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-medium transition",
                    on ? "border-ck-red bg-ck-red text-white" : "hover:bg-muted",
                  )}
                >
                  <span aria-hidden>{s.photoEmoji}</span>
                  {s.firstName}
                </button>
              );
            })}
          </div>
        </div>

        <TextareaField
          label="Internal note (staff only)"
          rows={2}
          value={draft.internalNote}
          onChange={(v) => setDraft({ ...draft, internalNote: v })}
          placeholder="Never shown to parents"
        />

        <label className="flex items-center gap-2 rounded-xl border p-3 text-sm">
          <input type="checkbox" checked={draft.publish} onChange={(e) => setDraft({ ...draft, publish: e.target.checked })} />
          Publish to parents now
        </label>
      </FormDialog>

      {/* post detail with comments */}
      <DetailDialog
        open={!!viewing}
        onOpenChange={(o) => {
          if (!o) {
            setViewing(null);
            setReply("");
          }
        }}
        title={viewing ? `${KIND_EMOJI[viewing.kind]} ${viewing.title}` : ""}
        description={viewing ? `${viewing.authorName} · ${timeAgo(viewing.createdAt)}` : undefined}
        size="lg"
      >
        {viewing && (
          <>
            <p className="text-sm whitespace-pre-wrap">{viewing.body}</p>

            {viewing.media.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {viewing.media.map((m) => (
                  <span key={m.id} className="grid h-24 w-32 place-items-center rounded-xl bg-muted text-3xl" aria-hidden>
                    {m.placeholder ?? "🖼️"}
                  </span>
                ))}
              </div>
            )}

            <div>
              <p className="mb-1.5 text-xs font-bold tracking-wide text-muted-foreground uppercase">Tagged children</p>
              <div className="flex flex-wrap gap-1.5">
                {viewing.studentIds.map((id) => {
                  const s = students.find((x) => x.id === id);
                  return s ? (
                    <Badge key={id} variant="secondary">
                      {s.photoEmoji} {studentName(s)}
                    </Badge>
                  ) : null;
                })}
              </div>
            </div>

            {viewing.internalNote && (
              <div className="rounded-xl bg-ck-orange/10 p-3 text-sm">
                <p className="mb-1 text-xs font-bold tracking-wide text-amber-700 uppercase">Internal note</p>
                {viewing.internalNote}
              </div>
            )}

            <div>
              <p className="mb-1.5 text-xs font-bold tracking-wide text-muted-foreground uppercase">
                Comments ({viewing.comments.length})
              </p>
              <ul className="space-y-2">
                {viewing.comments.map((c) => (
                  <li key={c.id} className="rounded-xl bg-muted/50 p-2.5 text-sm">
                    <p className="text-xs font-semibold">
                      {c.authorName}
                      <span className="ml-1.5 font-normal text-muted-foreground">{timeAgo(c.createdAt)}</span>
                    </p>
                    <p>{c.body}</p>
                  </li>
                ))}
                {viewing.comments.length === 0 && <li className="text-sm text-muted-foreground">No comments yet.</li>}
              </ul>
              <form
                className="mt-2 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!reply.trim()) return;
                  commentOnActivity(viewing.id, { authorName: session.name, authorRole: "TEACHER", body: reply.trim() });
                  setReply("");
                  toast.success("Reply added");
                }}
              >
                <TextField value={reply} onChange={setReply} placeholder="Reply to parents…" className="flex-1" />
                <Button type="submit" size="icon" className="mt-0" aria-label="Send reply">
                  <Send />
                </Button>
              </form>
            </div>
          </>
        )}
      </DetailDialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete “${deleting?.title}”?`}
        description="Parents lose access to these photos immediately."
        confirmLabel="Delete post"
        onConfirm={() => {
          if (!deleting) return;
          removeItem("activities", deleting.id);
          toast.success("Post deleted");
          setDeleting(null);
        }}
      />
    </div>
  );
}
