"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CalendarPlus, Plus, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useErpStore } from "@/frontend/store/erpStore";
import { useGuardianId, useSession } from "@/frontend/store/session";
import { useSelectedChild } from "@/frontend/hooks/useSelection";
import { studentName } from "@/frontend/store/queries";
import { PageHeader } from "@/frontend/components/ui/PageHeader";
import { ConversationPanel } from "@/frontend/components/features/messaging/ConversationPanel";
import { FormDialog } from "@/frontend/components/ui/FormDialog";
import { SelectField, TextField, TextareaField } from "@/frontend/components/ui/Field";
import { SectionCard } from "@/frontend/components/ui/Bits";
import { StatusBadge } from "@/frontend/components/ui/StatusBadge";
import { EmptyState } from "@/frontend/components/ui/EmptyState";
import type { Meeting } from "@/shared/types/engagement.types";
import { newId, titleCase } from "@/shared/utils/common.util";
import { nowIso } from "@/shared/utils/date.util";
import { formatDateTime } from "@/frontend/utils/formatters";

export function MessagesView() {
  const session = useSession();
  const guardianId = useGuardianId();
  const { child, kids } = useSelectedChild();
  const classrooms = useErpStore((s) => s.classrooms);
  const staff = useErpStore((s) => s.staff);
  const meetings = useErpStore((s) => s.meetings);
  const startConversation = useErpStore((s) => s.startConversation);
  const addItem = useErpStore((s) => s.addItem);
  const patchItem = useErpStore((s) => s.patchItem);

  const [newOpen, setNewOpen] = useState(false);
  const [draft, setDraft] = useState({ studentId: "", teacherId: "", subject: "", body: "" });
  const [meetOpen, setMeetOpen] = useState(false);
  const [meetDraft, setMeetDraft] = useState({ studentId: "", mode: "VIDEO" as Meeting["mode"], when: "", agenda: "" });

  if (!child) return <EmptyState emoji="👶" title="No child linked to this account" />;

  const myMeetings = meetings.filter((m) => kids.some((k) => k.id === m.studentId));
  const teachers = staff.filter((s) => s.role === "TEACHER");
  const classTeacher = staff.find((s) => s.id === classrooms.find((c) => c.id === child.classroomId)?.teacherId);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Messages"
        description={`Talk to ${classTeacher?.name ?? "your class teacher"} or the school office.`}
        crumbs={[{ label: "Parent", href: "/parent" }, { label: "Messages" }]}
        actions={
          <>
            <Button variant="outline" onClick={() => setMeetOpen(true)}>
              <CalendarPlus /> Request a meeting
            </Button>
            <Button
              onClick={() => {
                setDraft({
                  studentId: child.id,
                  teacherId: classTeacher?.id ?? teachers[0]?.id ?? "",
                  subject: "",
                  body: "",
                });
                setNewOpen(true);
              }}
            >
              <Plus /> New message
            </Button>
          </>
        }
      />

      <Tabs defaultValue="threads">
        <TabsList>
          <TabsTrigger value="threads">Conversations</TabsTrigger>
          <TabsTrigger value="meetings">Meetings ({myMeetings.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="threads" className="pt-4">
          <ConversationPanel
            side="parent"
            participantIds={[session.id, guardianId, "usr_parent"]}
            senderId={session.id}
            senderName={session.name}
            senderRole="PARENT"
            onRequestMeeting={() => setMeetOpen(true)}
          />
        </TabsContent>

        <TabsContent value="meetings" className="space-y-3 pt-4">
          {myMeetings.length === 0 ? (
            <EmptyState
              emoji="🗓️"
              title="No meetings booked"
              description="Request a slot with your child's teacher — in person, by phone or video."
              action={<Button onClick={() => setMeetOpen(true)}>Request a meeting</Button>}
            />
          ) : (
            myMeetings.map((m) => (
              <SectionCard
                key={m.id}
                title={m.agenda || "Parent–teacher meeting"}
                description={`${m.teacherName} · ${formatDateTime(m.scheduledFor)} · ${m.durationMin} min`}
                icon={<Video className="h-4 w-4 text-ck-blue" />}
                action={
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline">{titleCase(m.mode)}</Badge>
                    <StatusBadge status={m.status} />
                  </div>
                }
              >
                <div className="flex flex-wrap gap-2">
                  {m.mode === "VIDEO" && m.status === "CONFIRMED" && (
                    <Button size="sm" onClick={() => toast.info("The join link opens 5 minutes before the meeting")}>
                      <Video /> Join call
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => toast.success("Added to your calendar")}>
                    Add to calendar
                  </Button>
                  {m.status !== "COMPLETED" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        patchItem("meetings", m.id, { status: "DECLINED" });
                        toast.success("Meeting cancelled — the teacher has been told");
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </SectionCard>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* new thread */}
      <FormDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        title="New message"
        submitLabel="Send"
        onSubmit={() => {
          const teacher = staff.find((s) => s.id === draft.teacherId);
          if (!teacher) {
            toast.error("Pick who you want to write to");
            return false;
          }
          if (!draft.body.trim()) {
            toast.error("Write a message");
            return false;
          }
          startConversation(
            {
              participantIds: [session.id, guardianId, teacher.id],
              parentName: session.name,
              teacherName: teacher.name,
              studentId: draft.studentId || child.id,
              subject: draft.subject.trim() || "Message from parent",
              lastMessageAt: nowIso(),
              lastMessagePreview: draft.body,
              unreadForParent: 0,
              unreadForTeacher: 1,
              archived: false,
            },
            draft.body.trim(),
            { senderId: session.id, senderName: session.name, senderRole: "PARENT" },
          );
          toast.success(`Message sent to ${teacher.name}`);
          setDraft({ studentId: "", teacherId: "", subject: "", body: "" });
          return true;
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            label="About which child"
            value={draft.studentId}
            onChange={(v) => setDraft({ ...draft, studentId: v })}
            options={kids.map((k) => ({ value: k.id, label: studentName(k) }))}
            placeholder="Select a child"
          />
          <SelectField
            label="To"
            value={draft.teacherId}
            onChange={(v) => setDraft({ ...draft, teacherId: v })}
            options={staff.map((s) => ({ value: s.id, label: `${s.name} — ${s.designation}` }))}
            placeholder="Select a teacher"
          />
        </div>
        <TextField label="Subject" value={draft.subject} onChange={(v) => setDraft({ ...draft, subject: v })} placeholder="Nap routine" />
        <TextareaField label="Message" rows={5} value={draft.body} onChange={(v) => setDraft({ ...draft, body: v })} />
      </FormDialog>

      {/* meeting request */}
      <FormDialog
        open={meetOpen}
        onOpenChange={setMeetOpen}
        title="Request a meeting"
        description="The teacher confirms or proposes another slot."
        submitLabel="Send request"
        onSubmit={() => {
          if (!meetDraft.when) {
            toast.error("Pick a preferred time");
            return false;
          }
          addItem("meetings", {
            id: newId("mt"),
            studentId: meetDraft.studentId || child.id,
            teacherName: classTeacher?.name ?? "Class teacher",
            parentName: session.name,
            mode: meetDraft.mode,
            scheduledFor: new Date(meetDraft.when).toISOString(),
            durationMin: 20,
            agenda: meetDraft.agenda,
            status: "REQUESTED",
            createdAt: nowIso(),
          });
          toast.success("Request sent — you'll get a confirmation shortly");
          setMeetOpen(false);
          return true;
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            label="Child"
            value={meetDraft.studentId}
            onChange={(v) => setMeetDraft({ ...meetDraft, studentId: v })}
            options={kids.map((k) => ({ value: k.id, label: studentName(k) }))}
            placeholder="Select a child"
          />
          <SelectField
            label="How"
            value={meetDraft.mode}
            onChange={(v) => setMeetDraft({ ...meetDraft, mode: v as Meeting["mode"] })}
            options={[
              { value: "VIDEO", label: "Video call" },
              { value: "IN_PERSON", label: "At school" },
              { value: "PHONE", label: "Phone call" },
            ]}
          />
        </div>
        <TextField label="Preferred time" type="datetime-local" value={meetDraft.when} onChange={(v) => setMeetDraft({ ...meetDraft, when: v })} />
        <TextareaField
          label="What would you like to discuss?"
          rows={3}
          value={meetDraft.agenda}
          onChange={(v) => setMeetDraft({ ...meetDraft, agenda: v })}
          placeholder="Speech development and how we can help at home"
        />
      </FormDialog>
    </div>
  );
}
