"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Camera, Heart, MessageSquare, Send, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useErpStore } from "@/frontend/store/erpStore";
import { useSession } from "@/frontend/store/session";
import { useSelectedChild } from "@/frontend/hooks/useSelection";
import { feedForStudents, studentName } from "@/frontend/store/queries";
import { PageHeader } from "@/frontend/components/ui/PageHeader";
import { EmojiAvatar, Tag } from "@/frontend/components/ui/Bits";
import { EmptyState } from "@/frontend/components/ui/EmptyState";
import { DetailDialog } from "@/frontend/components/ui/FormDialog";
import type { Activity, ActivityKind } from "@/shared/types/engagement.types";
import type { MediaRef } from "@/shared/types/common.types";
import { titleCase } from "@/shared/utils/common.util";
import { timeAgo } from "@/frontend/utils/formatters";
import { cn } from "@/lib/utils";

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

const FILTERS: (ActivityKind | "ALL")[] = ["ALL", "LEARNING", "ART", "PLAY", "OUTDOOR", "MEAL", "CELEBRATION"];

export function ActivityFeedView() {
  const session = useSession();
  const { child } = useSelectedChild();
  const activities = useErpStore((s) => s.activities);
  const toggleReaction = useErpStore((s) => s.toggleActivityReaction);
  const comment = useErpStore((s) => s.commentOnActivity);

  const [filter, setFilter] = useState<ActivityKind | "ALL">("ALL");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [lightbox, setLightbox] = useState<{ activity: Activity; media: MediaRef } | null>(null);

  if (!child) return <EmptyState emoji="👶" title="No child linked to this account" />;

  const all = feedForStudents(activities, [child.id]);
  const feed = filter === "ALL" ? all : all.filter((a) => a.kind === filter);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Daily feed"
        description={`Photos, notes and moments from ${child.firstName}'s day.`}
        crumbs={[{ label: "Parent", href: "/parent" }, { label: "Feed" }]}
      />

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold transition",
              filter === f ? "bg-ck-red text-white" : "bg-muted text-muted-foreground hover:bg-muted/70",
            )}
          >
            {f === "ALL" ? "Everything" : `${KIND_EMOJI[f]} ${titleCase(f)}`}
          </button>
        ))}
      </div>

      {feed.length === 0 ? (
        <EmptyState
          emoji="📸"
          title={filter === "ALL" ? "No updates yet" : "Nothing in this category"}
          description="Teachers post photos and notes through the day — check back after snack time."
        />
      ) : (
        <div className="space-y-4">
          {feed.map((a) => {
            const liked = a.reactions.includes(session.id);
            return (
              <article key={a.id} className="overflow-hidden rounded-3xl border bg-card">
                <header className="flex items-center gap-3 p-3.5">
                  <EmojiAvatar emoji={KIND_EMOJI[a.kind]} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{a.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {a.authorName} · {timeAgo(a.createdAt)}
                    </p>
                  </div>
                  <Badge variant="outline">{titleCase(a.kind)}</Badge>
                </header>

                {a.media.length > 0 && (
                  <div className={cn("grid gap-1 bg-muted/40 p-1", a.media.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
                    {a.media.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setLightbox({ activity: a, media: m })}
                        className="grid aspect-video place-items-center bg-ck-sky text-5xl transition hover:opacity-90"
                        aria-label={m.caption ?? "Open media"}
                      >
                        <span aria-hidden>{m.placeholder ?? "🖼️"}</span>
                      </button>
                    ))}
                  </div>
                )}

                <div className="space-y-3 p-3.5">
                  <p className="text-sm whitespace-pre-wrap">{a.body}</p>

                  <div className="flex flex-wrap gap-1">
                    {a.studentIds.includes(child.id) && <Tag tone="green">{child.firstName} was tagged</Tag>}
                  </div>

                  <div className="flex items-center gap-4 border-t pt-2.5 text-sm">
                    <button
                      type="button"
                      onClick={() => {
                        toggleReaction(a.id, session.id);
                        if (!liked) toast.success("❤️ Liked");
                      }}
                      className={cn(
                        "flex items-center gap-1.5 font-medium transition",
                        liked ? "text-ck-red" : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Heart className={liked ? "h-4 w-4 fill-ck-red" : "h-4 w-4"} />
                      {a.reactions.length > 0 ? a.reactions.length : "Like"}
                    </button>
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <MessageSquare className="h-4 w-4" />
                      {a.comments.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => toast.success("Link copied — share it with family")}
                      className="ml-auto flex items-center gap-1.5 text-muted-foreground transition hover:text-foreground"
                    >
                      <Share2 className="h-4 w-4" />
                      Share
                    </button>
                  </div>

                  {a.comments.length > 0 && (
                    <ul className="space-y-2">
                      {a.comments.map((c) => (
                        <li key={c.id} className="rounded-xl bg-muted/50 p-2.5 text-sm">
                          <p className="text-xs font-semibold">
                            {c.authorName}
                            <span className="ml-1.5 font-normal text-muted-foreground">
                              {c.authorRole === "TEACHER" ? "· teacher" : ""} {timeAgo(c.createdAt)}
                            </span>
                          </p>
                          <p>{c.body}</p>
                        </li>
                      ))}
                    </ul>
                  )}

                  <form
                    className="flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const body = (drafts[a.id] ?? "").trim();
                      if (!body) return;
                      comment(a.id, { authorName: session.name, authorRole: "PARENT", body });
                      setDrafts((d) => ({ ...d, [a.id]: "" }));
                      toast.success("Comment posted");
                    }}
                  >
                    <Input
                      value={drafts[a.id] ?? ""}
                      onChange={(e) => setDrafts((d) => ({ ...d, [a.id]: e.target.value }))}
                      placeholder="Say something nice…"
                      className="h-9"
                      aria-label="Add a comment"
                    />
                    <Button type="submit" size="icon-sm" disabled={!(drafts[a.id] ?? "").trim()} aria-label="Post comment">
                      <Send />
                    </Button>
                  </form>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <DetailDialog
        open={!!lightbox}
        onOpenChange={(o) => !o && setLightbox(null)}
        title={lightbox?.media.caption ?? lightbox?.activity.title ?? ""}
        description={lightbox ? `${lightbox.activity.authorName} · ${timeAgo(lightbox.activity.createdAt)}` : undefined}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setLightbox(null)}>
              Close
            </Button>
            <Button onClick={() => toast.success("Saved to your device")}>
              <Camera /> Save photo
            </Button>
          </>
        }
      >
        <div className="grid aspect-video place-items-center rounded-2xl bg-ck-sky text-7xl" aria-hidden>
          {lightbox?.media.placeholder ?? "🖼️"}
        </div>
        <p className="text-sm text-muted-foreground">
          {lightbox?.activity.body}
          {lightbox && lightbox.activity.studentIds.length > 0 && (
            <span className="mt-2 block text-xs">
              Tagged: {lightbox.activity.studentIds.length} children including {studentName(child)}
            </span>
          )}
        </p>
      </DetailDialog>
    </div>
  );
}
