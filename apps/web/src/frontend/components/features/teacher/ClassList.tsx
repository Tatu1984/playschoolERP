"use client";

import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useErpStore } from "@/frontend/store/erpStore";
import { useSelectedClass } from "@/frontend/hooks/useSelection";
import { attendanceFor, presentTodayCount, rosterOf } from "@/frontend/store/queries";
import { PageHeader } from "@/frontend/components/ui/PageHeader";
import { SectionCard, EmojiAvatar } from "@/frontend/components/ui/Bits";
import { EmptyState } from "@/frontend/components/ui/EmptyState";
import { CATALOGUE } from "@/shared/fixtures";
import { dateKey, today } from "@/shared/utils/date.util";

export function ClassList() {
  const { classes } = useSelectedClass();
  const students = useErpStore((s) => s.students);
  const staff = useErpStore((s) => s.staff);
  const attendance = useErpStore((s) => s.attendance);
  const lessons = useErpStore((s) => s.lessons);
  const todayKey = dateKey(today());

  if (classes.length === 0) {
    return <EmptyState emoji="🏫" title="No classes yet" description="An admin needs to assign you a classroom." />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="My classes"
        description="Roster, attendance and today's plan for every class you teach."
        crumbs={[{ label: "Teacher", href: "/teacher" }, { label: "Classes" }]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {classes.map((c) => {
          const roster = rosterOf(students, c.id);
          const present = presentTodayCount(attendance, c.id);
          const teacher = staff.find((s) => s.id === c.teacherId);
          const todays = lessons.filter((l) => l.classroomId === c.id && l.date === todayKey);
          const marked = roster.filter((s) => {
            const st = attendanceFor(attendance, s.id, todayKey)?.status;
            return st && st !== "UNMARKED";
          }).length;

          return (
            <SectionCard
              key={c.id}
              title={c.name}
              description={`${CATALOGUE.programs.find((p) => p.slug === c.programSlug)?.name} · ${c.room}`}
              icon={<Users className="h-4 w-4 text-ck-blue" />}
              action={
                <Button size="xs" variant="outline" asChild>
                  <Link href={`/teacher/classes/${c.id}`}>
                    Open <ArrowRight />
                  </Link>
                </Button>
              }
            >
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="font-heading text-xl font-bold">{roster.length}</p>
                  <p className="text-[10px] tracking-wide text-muted-foreground uppercase">On the roll</p>
                </div>
                <div>
                  <p className="font-heading text-xl font-bold text-ck-green">{present}</p>
                  <p className="text-[10px] tracking-wide text-muted-foreground uppercase">Present</p>
                </div>
                <div>
                  <p className="font-heading text-xl font-bold">{todays.length}</p>
                  <p className="text-[10px] tracking-wide text-muted-foreground uppercase">Lessons today</p>
                </div>
              </div>

              <div className="mt-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">Attendance marked</span>
                  <span className="tabular-nums text-muted-foreground">
                    {marked}/{roster.length}
                  </span>
                </div>
                <Progress value={roster.length ? (marked / roster.length) * 100 : 0} className="mt-1.5" />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {roster.slice(0, 8).map((s) => (
                  <EmojiAvatar key={s.id} emoji={s.photoEmoji} size="xs" />
                ))}
                {roster.length > 8 && <Badge variant="outline">+{roster.length - 8}</Badge>}
              </div>

              <p className="mt-2 text-xs text-muted-foreground">Class teacher: {teacher?.name ?? "—"}</p>
            </SectionCard>
          );
        })}
      </div>
    </div>
  );
}
