"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CalendarPlus, Check, MessageCircle, Plus, Video, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useErpStore } from "@/frontend/store/erpStore";
import { useSession, useStaffId } from "@/frontend/store/session";
import { useSelectedClass } from "@/frontend/hooks/useSelection";
import { rosterOf, studentName } from "@/frontend/store/queries";
import { PageHeader } from "@/frontend/components/ui/PageHeader";
import { ConversationPanel } from "@/frontend/components/features/messaging/ConversationPanel";
import { FormDialog } from "@/frontend/components/ui/FormDialog";
import { SelectField, TextField, TextareaField } from "@/frontend/components/ui/Field";
import { SectionCard } from "@/frontend/components/ui/Bits";
import { StatusBadge } from "@/frontend/components/ui/StatusBadge";
import { RowActions } from "@/frontend/components/ui/RowActions";
import { EmptyState } from "@/frontend/components/ui/EmptyState";
import type { Meeting } from "@/shared/types/engagement.types";
import { newId, titleCase } from "@/shared/utils/common.util";
import { nowIso } from "@/shared/utils/date.util";
import { formatDateTime } from "@/frontend/utils/formatters";

export function TeacherMessages() {
  const session = useSession();
  const staffId = useStaffId();
  const { classroom } = useSelectedClass();
  const students = useErpStore((s) => s.students);
  const guardians = useErpStore((s) => s.guardians);
  const meetings = useErpStore((s) => s.meetings);
  const startConversation = useErpStore((s) => s.startConversation);
  const addItem = useErpStore((s) => s.addItem);
  const patchItem = useErpStore((s) => s.patchItem);

  const roster = classroom ? rosterOf(students, classroom.id) : students;

  const [newOpen, setNewOpen] = useState(false);
  const [draft, setDraft] = useState({ studentId: "", subject: "", body: "" });
  const [meetOpen, setMeetOpen] = useState(false);
  const [meetDraft, setMeetDraft] = useState({
    studentId: "",
    mode: "VIDEO" as Meeting["mode"],
    when: "",
    duration: "20",
    agenda: "",
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Messages"
        description="Threads with parents, plus meeting requests. Voice notes are supported."
        crumbs={[{ label: "Teacher", href: "/teacher" }, { label: "Messages" }]}
        actions={
          <>
            <Button variant="outline" onClick={() => setMeetOpen(true)}>
              <CalendarPlus /> Schedule meeting
            </Button>
            <Button onClick={() => setNewOpen(true)}>
              <Plus /> New thread
            </Button>
          </>
        }
      />

      <Tabs defaultValue="threads">
        <TabsList>
          <TabsTrigger value="threads">
            <MessageCircle className="mr-1 h-3.5 w-3.5" /> Threads
          </TabsTrigger>
          <TabsTrigger value="meetings">Meetings ({meetings.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="threads" className="pt-4">
          <ConversationPanel
            side="teacher"
            participantIds={[staffId, session.id]}
            senderId={staffId}
            senderName={session.name}
            senderRole="TEACHER"
            onRequestMeeting={() => setMeetOpen(true)}
          />
        </TabsContent>

        <TabsContent value="meetings" className="space-y-3 pt-4">
          {meetings.length === 0 ? (
            <EmptyState emoji="🗓️" title="No meetings" action={<Button onClick={() => setMeetOpen(true)}>Schedule one</Button>} />
          ) : (
            meetings.map((m) => {
              const child = students.find((s) => s.id === m.studentId);
              return (
                <SectionCard
                  key={m.id}
                  title={child ? `${studentName(child)} — ${m.agenda || "Parent meeting"}` : m.agenda}
                  description={`${m.parentName} · ${formatDateTime(m.scheduledFor)} · ${m.durationMin} min`}
                  icon={<Video className="h-4 w-4 text-ck-blue" />}
                  action={
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline">{titleCase(m.mode)}</Badge>
                      <StatusBadge status={m.status} />
                      <RowActions
                        label="Meeting"
                        actions={[
                          {
                            label: "Confirm",
                            icon: <Check />,
                            disabled: m.status === "CONFIRMED",
                            onSelect: () => {
                              patchItem("meetings", m.id, { status: "CONFIRMED" });
                              toast.success("Meeting confirmed");
                            },
                          },
                          {
                            label: "Mark completed",
                            onSelect: () => {
                              patchItem("meetings", m.id, { status: "COMPLETED" });
                              toast.success("Marked completed");
                            },
                          },
                          {
                            label: "Join call",
                            icon: <Video />,
                            disabled: m.mode !== "VIDEO",
                            onSelect: () => toast.info("Video calls connect through Daily.co in production"),
                          },
                          {
                            label: "Decline",
                            icon: <X />,
                            destructive: true,
                            separatorBefore: true,
                            onSelect: () => {
                              patchItem("meetings", m.id, { status: "DECLINED" });
                              toast.success("Meeting declined");
                            },
                          },
                        ]}
                      />
                    </div>
                  }
                >
                  {m.joinUrl && <p className="truncate text-xs text-muted-foreground">{m.joinUrl}</p>}
                </SectionCard>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      {/* new thread */}
      <FormDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        title="Start a conversation"
        submitLabel="Send"
        onSubmit={() => {
          const child = students.find((s) => s.id === draft.studentId);
          if (!child) {
            toast.error("Pick a child");
            return false;
          }
          if (!draft.body.trim()) {
            toast.error("Write a message");
            return false;
          }
          const guardian = guardians.find((g) => child.guardianIds.includes(g.id));
          startConversation(
            {
              participantIds: [staffId, guardian?.userId ?? guardian?.id ?? "parent"],
              parentName: guardian?.name ?? "Parent",
              teacherName: session.name,
              studentId: child.id,
              subject: draft.subject.trim() || `About ${child.firstName}`,
              lastMessageAt: nowIso(),
              lastMessagePreview: draft.body,
              unreadForParent: 1,
              unreadForTeacher: 0,
              archived: false,
            },
            draft.body.trim(),
            { senderId: staffId, senderName: session.name, senderRole: "TEACHER" },
          );
          toast.success(`Message sent to ${guardian?.name ?? "the parent"}`);
          setDraft({ studentId: "", subject: "", body: "" });
          return true;
        }}
      >
        <SelectField
          label="About which child"
          value={draft.studentId}
          onChange={(v) => setDraft({ ...draft, studentId: v })}
          options={roster.map((s) => ({ value: s.id, label: `${studentName(s)} — ${s.primaryGuardianName ?? ""}` }))}
          placeholder="Select a child"
        />
        <TextField label="Subject" value={draft.subject} onChange={(v) => setDraft({ ...draft, subject: v })} placeholder="Nap routine" />
        <TextareaField label="Message" rows={4} value={draft.body} onChange={(v) => setDraft({ ...draft, body: v })} />
      </FormDialog>

      {/* schedule meeting */}
      <FormDialog
        open={meetOpen}
        onOpenChange={setMeetOpen}
        title="Schedule a meeting"
        submitLabel="Send invite"
        onSubmit={() => {
          const child = students.find((s) => s.id === meetDraft.studentId);
          if (!child || !meetDraft.when) {
            toast.error("Pick a child and a time");
            return false;
          }
          const guardian = guardians.find((g) => child.guardianIds.includes(g.id));
          addItem("meetings", {
            id: newId("mt"),
            studentId: child.id,
            teacherName: session.name,
            parentName: guardian?.name ?? "Parent",
            mode: meetDraft.mode,
            scheduledFor: new Date(meetDraft.when).toISOString(),
            durationMin: Number(meetDraft.duration) || 20,
            agenda: meetDraft.agenda,
            status: "CONFIRMED",
            joinUrl: meetDraft.mode === "VIDEO" ? `https://meet.climbkiddo.in/${child.id}` : undefined,
            createdAt: nowIso(),
          });
          toast.success(`Invite sent to ${guardian?.name ?? "the parent"}`);
          setMeetOpen(false);
          return true;
        }}
      >
        <SelectField
          label="Child"
          value={meetDraft.studentId}
          onChange={(v) => setMeetDraft({ ...meetDraft, studentId: v })}
          options={roster.map((s) => ({ value: s.id, label: studentName(s) }))}
          placeholder="Select a child"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            label="Mode"
            value={meetDraft.mode}
            onChange={(v) => setMeetDraft({ ...meetDraft, mode: v as Meeting["mode"] })}
            options={[
              { value: "VIDEO", label: "Video call" },
              { value: "IN_PERSON", label: "In person" },
              { value: "PHONE", label: "Phone" },
            ]}
          />
          <TextField label="Duration (min)" type="number" value={meetDraft.duration} onChange={(v) => setMeetDraft({ ...meetDraft, duration: v })} />
          <TextField label="When" type="datetime-local" value={meetDraft.when} onChange={(v) => setMeetDraft({ ...meetDraft, when: v })} className="sm:col-span-2" />
        </div>
        <TextareaField label="Agenda" rows={2} value={meetDraft.agenda} onChange={(v) => setMeetDraft({ ...meetDraft, agenda: v })} placeholder="Term 2 progress + sleep routine" />
      </FormDialog>
    </div>
  );
}
