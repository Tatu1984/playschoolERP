"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Camera, ClipboardCheck, LineChart, MessageCircle, Phone, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useErpStore } from "@/frontend/store/erpStore";
import {
  attendanceFor,
  attendanceRate,
  feedForClassrooms,
  latestReport,
  rosterOf,
  skillSeries,
  studentName,
} from "@/frontend/store/queries";
import { PageHeader } from "@/frontend/components/ui/PageHeader";
import { KpiCard } from "@/frontend/components/ui/KpiCard";
import { DataTable, type Column } from "@/frontend/components/ui/DataTable";
import { SectionCard, EmojiAvatar, InfoItem, Tag } from "@/frontend/components/ui/Bits";
import { DetailDialog } from "@/frontend/components/ui/FormDialog";
import { StatusBadge } from "@/frontend/components/ui/StatusBadge";
import { SkillBars } from "@/frontend/components/ui/Charts";
import { EmptyState } from "@/frontend/components/ui/EmptyState";
import { CATALOGUE } from "@/shared/fixtures";
import type { Student } from "@/shared/types/school.types";
import { ageFrom, dateKey, today } from "@/shared/utils/date.util";
import { timeAgo } from "@/frontend/utils/formatters";

export function ClassDetail({ classroomId }: { classroomId: string }) {
  const classrooms = useErpStore((s) => s.classrooms);
  const students = useErpStore((s) => s.students);
  const guardians = useErpStore((s) => s.guardians);
  const staff = useErpStore((s) => s.staff);
  const attendance = useErpStore((s) => s.attendance);
  const activities = useErpStore((s) => s.activities);
  const lessons = useErpStore((s) => s.lessons);
  const reports = useErpStore((s) => s.progressReports);

  const [viewing, setViewing] = useState<Student | null>(null);

  const classroom = classrooms.find((c) => c.id === classroomId);
  if (!classroom) {
    return (
      <EmptyState
        emoji="🤷"
        title="Class not found"
        description="It may have been deleted."
        action={
          <Button asChild variant="outline">
            <Link href="/teacher/classes">Back to classes</Link>
          </Button>
        }
      />
    );
  }

  const roster = rosterOf(students, classroom.id);
  const todayKey = dateKey(today());
  const feed = feedForClassrooms(activities, [classroom.id]);
  const classLessons = lessons.filter((l) => l.classroomId === classroom.id);
  const teacher = staff.find((s) => s.id === classroom.teacherId);

  const columns: Column<Student>[] = [
    {
      key: "child",
      header: "Child",
      sortValue: (s) => studentName(s),
      cell: (s) => (
        <div className="flex items-center gap-2.5">
          <EmojiAvatar emoji={s.photoEmoji} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-medium">{studentName(s)}</p>
            <p className="truncate text-xs text-muted-foreground">{ageFrom(s.dob)} yrs · {s.admissionNo}</p>
          </div>
        </div>
      ),
    },
    {
      key: "today",
      header: "Today",
      sortValue: (s) => attendanceFor(attendance, s.id, todayKey)?.status ?? "UNMARKED",
      cell: (s) => <StatusBadge status={attendanceFor(attendance, s.id, todayKey)?.status ?? "UNMARKED"} />,
    },
    {
      key: "rate",
      header: "Attendance",
      hideOnMobile: true,
      sortValue: (s) => attendanceRate(attendance, s.id),
      cell: (s) => <span className="tabular-nums">{attendanceRate(attendance, s.id)}%</span>,
    },
    {
      key: "guardian",
      header: "Guardian",
      hideOnMobile: true,
      sortValue: (s) => s.primaryGuardianName ?? "",
      cell: (s) => {
        const g = guardians.find((x) => s.guardianIds.includes(x.id));
        return (
          <div className="min-w-0">
            <p className="truncate text-sm">{g?.name ?? "—"}</p>
            <p className="truncate text-xs text-muted-foreground">{g?.phone}</p>
          </div>
        );
      },
    },
    {
      key: "allergies",
      header: "Allergies",
      hideOnMobile: true,
      sortValue: (s) => s.allergies.length,
      cell: (s) =>
        s.allergies.length ? (
          <div className="flex flex-wrap gap-1">
            {s.allergies.map((a) => (
              <Tag key={a} tone="brand">
                ⚠️ {a}
              </Tag>
            ))}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">none</span>
        ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={classroom.name}
        description={`${CATALOGUE.programs.find((p) => p.slug === classroom.programSlug)?.name} · ${classroom.room} · ${teacher?.name ?? "no teacher"}`}
        crumbs={[
          { label: "Teacher", href: "/teacher" },
          { label: "Classes", href: "/teacher/classes" },
          { label: classroom.name },
        ]}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/teacher/attendance">
                <ClipboardCheck /> Attendance
              </Link>
            </Button>
            <Button asChild>
              <Link href="/teacher/activities">
                <Camera /> Post update
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Children" value={roster.length} accent="navy" icon={<Users className="h-4 w-4" />} sub={`capacity ${classroom.capacity}`} />
        <KpiCard
          label="Present today"
          value={roster.filter((s) => ["PRESENT", "LATE"].includes(attendanceFor(attendance, s.id, todayKey)?.status ?? "")).length}
          accent="green"
        />
        <KpiCard label="Posts" value={feed.length} accent="magenta" />
        <KpiCard label="Lessons planned" value={classLessons.length} accent="blue" />
      </div>

      <Tabs defaultValue="roster">
        <TabsList>
          <TabsTrigger value="roster">Roster ({roster.length})</TabsTrigger>
          <TabsTrigger value="feed">Feed ({feed.length})</TabsTrigger>
          <TabsTrigger value="lessons">Lessons ({classLessons.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="roster" className="pt-4">
          <DataTable
            rows={roster}
            columns={columns}
            rowId={(s) => s.id}
            searchable={(s) => `${studentName(s)} ${s.admissionNo} ${s.primaryGuardianName ?? ""}`}
            searchPlaceholder="Search the roster…"
            exportName={`${classroom.name}-roster`}
            onRowClick={setViewing}
            rowActions={(s) => [
              { label: "Child profile", icon: <Users />, onSelect: () => setViewing(s) },
              {
                label: "Message guardian",
                icon: <MessageCircle />,
                onSelect: () => toast.info(`Opening a thread about ${s.firstName}…`),
              },
              {
                label: "Call guardian",
                icon: <Phone />,
                onSelect: () => {
                  const g = guardians.find((x) => s.guardianIds.includes(x.id));
                  toast.info(`Dialling ${g?.phone ?? "guardian"}…`);
                },
              },
              {
                label: "Open report",
                icon: <LineChart />,
                separatorBefore: true,
                onSelect: () => toast.info("Reports live under Teacher → Reports"),
              },
            ]}
            emptyTitle="No children in this class"
            emptyEmoji="🧒"
          />
        </TabsContent>

        <TabsContent value="feed" className="space-y-3 pt-4">
          {feed.length === 0 ? (
            <EmptyState emoji="📸" title="No posts yet" />
          ) : (
            feed.map((a) => (
              <SectionCard key={a.id} title={a.title} description={`${a.authorName} · ${timeAgo(a.createdAt)}`}>
                <p className="text-sm text-muted-foreground">{a.body}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {a.published ? <Badge variant="secondary">Published</Badge> : <Badge variant="outline">Draft</Badge>}
                  <span className="text-xs text-muted-foreground">
                    {a.reactions.length} hearts · {a.comments.length} comments
                  </span>
                </div>
              </SectionCard>
            ))
          )}
        </TabsContent>

        <TabsContent value="lessons" className="pt-4">
          {classLessons.length === 0 ? (
            <EmptyState emoji="📚" title="No lessons planned" action={<Button asChild><Link href="/teacher/lessons">Open planner</Link></Button>} />
          ) : (
            <ul className="space-y-2">
              {classLessons.map((l) => (
                <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{l.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {l.date} · {l.slot.toLowerCase()} · {l.objective}
                    </p>
                  </div>
                  <StatusBadge status={l.status} />
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>

      <DetailDialog
        open={!!viewing}
        onOpenChange={(o) => !o && setViewing(null)}
        title={viewing ? studentName(viewing) : ""}
        description={viewing ? `${classroom.name} · ${viewing.admissionNo}` : undefined}
        size="lg"
      >
        {viewing && (
          <>
            <div className="flex items-center gap-3">
              <EmojiAvatar emoji={viewing.photoEmoji} size="lg" />
              <div>
                <p className="font-heading text-lg font-bold">{studentName(viewing)}</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <StatusBadge status={viewing.status} />
                  <Badge variant="secondary">{ageFrom(viewing.dob)} yrs</Badge>
                  <Badge variant="outline">{attendanceRate(attendance, viewing.id)}% attendance</Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-xl border p-3">
              <InfoItem label="Blood group" value={viewing.bloodGroup} />
              <InfoItem label="Guardian" value={viewing.primaryGuardianName ?? "—"} />
              <InfoItem
                label="Allergies"
                value={viewing.allergies.length ? viewing.allergies.join(", ") : "None"}
                className="col-span-2"
              />
              {viewing.medicalNotes && <InfoItem label="Medical notes" value={viewing.medicalNotes} className="col-span-2" />}
            </div>

            <div>
              <p className="mb-1.5 text-xs font-bold tracking-wide text-muted-foreground uppercase">
                Latest report — {latestReport(reports, viewing.id)?.term ?? "not published"}
              </p>
              <SkillBars data={skillSeries(latestReport(reports, viewing.id))} />
            </div>
          </>
        )}
      </DetailDialog>
    </div>
  );
}
