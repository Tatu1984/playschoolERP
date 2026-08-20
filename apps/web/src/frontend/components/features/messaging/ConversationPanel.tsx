"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Archive, Mic, Paperclip, Search, Send, Square, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useErpStore } from "@/frontend/store/erpStore";
import { conversationsFor, messagesOf, studentName } from "@/frontend/store/queries";
import { EmojiAvatar } from "@/frontend/components/ui/Bits";
import { EmptyState } from "@/frontend/components/ui/EmptyState";
import { RowActions } from "@/frontend/components/ui/RowActions";
import { formatDuration, formatTime, timeAgo } from "@/frontend/utils/formatters";
import { initials } from "@/shared/utils/common.util";
import { cn } from "@/lib/utils";

/**
 * Two-pane messaging used by both the teacher panel and the parent portal.
 * `side` decides whose unread counter clears and how bubbles are aligned.
 */
export function ConversationPanel({
  side,
  participantIds,
  senderId,
  senderName,
  senderRole,
  onRequestMeeting,
}: {
  side: "parent" | "teacher";
  /** Ids that count as "me" when matching conversations (session + persona). */
  participantIds: string[];
  senderId: string;
  senderName: string;
  senderRole: "PARENT" | "TEACHER" | "ADMIN";
  onRequestMeeting?: () => void;
}) {
  const conversations = useErpStore((s) => s.conversations);
  const messages = useErpStore((s) => s.messages);
  const students = useErpStore((s) => s.students);
  const sendMessage = useErpStore((s) => s.sendMessage);
  const markRead = useErpStore((s) => s.markConversationRead);
  const patchItem = useErpStore((s) => s.patchItem);

  const mine = participantIds
    .flatMap((id) => conversationsFor(conversations, id))
    .filter((c, i, arr) => arr.findIndex((x) => x.id === c.id) === i)
    .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));

  const [activeId, setActiveId] = useState<string | null>(mine[0]?.id ?? null);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [recording, setRecording] = useState(false);
  const [recSecs, setRecSecs] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);

  const shown = mine.filter((c) => {
    if (c.archived) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return `${c.parentName} ${c.teacherName} ${c.subject}`.toLowerCase().includes(q);
  });

  const active = mine.find((c) => c.id === activeId) ?? shown[0];
  const thread = active ? messagesOf(messages, active.id) : [];

  // Guard on the unread count, not the conversation object: markRead writes new
  // object identities, so an unguarded effect would re-fire forever.
  const openId = active?.id;
  const openUnread = active ? (side === "parent" ? active.unreadForParent : active.unreadForTeacher) : 0;
  useEffect(() => {
    if (openId && openUnread > 0) markRead(openId, side);
  }, [openId, openUnread, side, markRead]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [thread.length]);

  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => setRecSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [recording]);

  function send() {
    if (!active || !draft.trim()) return;
    sendMessage(active.id, { senderId, senderName, senderRole, kind: "TEXT", body: draft.trim() });
    setDraft("");
  }

  function stopRecording() {
    if (!active) return;
    setRecording(false);
    sendMessage(active.id, {
      senderId,
      senderName,
      senderRole,
      kind: "VOICE",
      body: "Voice note",
      durationSec: Math.max(1, recSecs),
    });
    setRecSecs(0);
    toast.success("Voice note sent");
  }

  if (mine.length === 0) {
    return (
      <EmptyState
        emoji="💬"
        title="No conversations yet"
        description={
          side === "parent"
            ? "Start a thread with your child's class teacher."
            : "Parents' messages will appear here."
        }
      />
    );
  }

  return (
    <div className="grid gap-3 lg:grid-cols-[320px_1fr]">
      {/* thread list */}
      <Card className="flex max-h-[70vh] flex-col overflow-hidden p-0">
        <div className="border-b p-2.5">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search conversations"
              className="h-9 pl-8"
              aria-label="Search conversations"
            />
          </div>
        </div>
        <ul className="flex-1 divide-y overflow-y-auto">
          {shown.map((c) => {
            const child = students.find((s) => s.id === c.studentId);
            const unread = side === "parent" ? c.unreadForParent : c.unreadForTeacher;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setActiveId(c.id)}
                  className={cn(
                    "flex w-full items-start gap-2.5 p-3 text-left transition hover:bg-muted/60",
                    active?.id === c.id && "bg-ck-red/5",
                  )}
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ck-navy/10 text-xs font-bold text-ck-navy">
                    {initials(side === "parent" ? c.teacherName : c.parentName)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold">
                        {side === "parent" ? c.teacherName : c.parentName}
                      </span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">{timeAgo(c.lastMessageAt)}</span>
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">{c.subject}</span>
                    <span className="mt-0.5 flex items-center justify-between gap-2">
                      <span className="truncate text-xs text-foreground/70">{c.lastMessagePreview}</span>
                      {unread > 0 && (
                        <span className="grid h-4 min-w-4 shrink-0 place-items-center rounded-full bg-ck-red px-1 text-[9px] font-bold text-white">
                          {unread}
                        </span>
                      )}
                    </span>
                    {child && (
                      <Badge variant="outline" className="mt-1 text-[10px]">
                        {studentName(child)}
                      </Badge>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
          {shown.length === 0 && (
            <li className="p-6 text-center text-sm text-muted-foreground">No matches.</li>
          )}
        </ul>
      </Card>

      {/* thread */}
      <Card className="flex max-h-[70vh] flex-col overflow-hidden p-0">
        {!active ? (
          <EmptyState emoji="👈" title="Pick a conversation" />
        ) : (
          <>
            <div className="flex items-center justify-between gap-2 border-b p-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <EmojiAvatar emoji={side === "parent" ? "👩‍🏫" : "👪"} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {side === "parent" ? active.teacherName : active.parentName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{active.subject}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {onRequestMeeting && (
                  <Button size="sm" variant="outline" onClick={onRequestMeeting}>
                    <Video /> Meet
                  </Button>
                )}
                <RowActions
                  label="Conversation"
                  actions={[
                    {
                      label: "Mark as read",
                      onSelect: () => {
                        markRead(active.id, side);
                        toast.success("Marked read");
                      },
                    },
                    {
                      label: "Archive",
                      icon: <Archive />,
                      destructive: true,
                      onSelect: () => {
                        patchItem("conversations", active.id, { archived: true });
                        setActiveId(null);
                        toast.success("Conversation archived");
                      },
                    },
                  ]}
                />
              </div>
            </div>

            <div className="flex-1 space-y-2.5 overflow-y-auto bg-muted/20 p-3">
              {thread.map((m) => {
                const own = m.senderRole === senderRole;
                return (
                  <div key={m.id} className={cn("flex", own ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[78%] rounded-2xl px-3 py-2 text-sm shadow-sm",
                        own ? "rounded-br-sm bg-ck-red text-white" : "rounded-bl-sm bg-card",
                      )}
                    >
                      {!own && <p className="mb-0.5 text-[10px] font-bold opacity-70">{m.senderName}</p>}
                      {m.kind === "VOICE" ? (
                        <span className="flex items-center gap-2">
                          <Mic className="h-3.5 w-3.5" />
                          Voice note · {formatDuration(m.durationSec ?? 0)}
                        </span>
                      ) : (
                        <p className="whitespace-pre-wrap">{m.body}</p>
                      )}
                      <p className={cn("mt-1 text-[10px]", own ? "text-white/70" : "text-muted-foreground")}>
                        {formatTime(m.createdAt)}
                        {own && m.readAt ? " · read" : ""}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
              className="flex items-center gap-2 border-t p-2.5"
            >
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label="Attach a file"
                onClick={() => toast.info("Attachments arrive with the media service")}
              >
                <Paperclip />
              </Button>
              {recording ? (
                <div className="flex flex-1 items-center gap-2 rounded-lg bg-ck-red/10 px-3 py-2 text-sm text-ck-red">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-ck-red" />
                  Recording {formatDuration(recSecs)}
                </div>
              ) : (
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Write a message…"
                  className="h-9 flex-1"
                  aria-label="Message"
                />
              )}
              {recording ? (
                <Button type="button" size="icon-sm" onClick={stopRecording} aria-label="Send voice note">
                  <Square />
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Record a voice note"
                    onClick={() => {
                      setRecording(true);
                      setRecSecs(0);
                    }}
                  >
                    <Mic />
                  </Button>
                  <Button type="submit" size="icon-sm" disabled={!draft.trim()} aria-label="Send">
                    <Send />
                  </Button>
                </>
              )}
            </form>
          </>
        )}
      </Card>
    </div>
  );
}
