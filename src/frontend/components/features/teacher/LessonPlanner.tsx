"use client";

import { useState } from "react";
import { toast } from "sonner";
import { BookOpen, Check, Copy, Pencil, Plus, SkipForward, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useErpStore } from "@/frontend/store/erpStore";
import { useStaffId } from "@/frontend/store/session";
import { useSelectedClass } from "@/frontend/hooks/useSelection";
import { PageHeader } from "@/frontend/components/ui/PageHeader";
import { KpiCard } from "@/frontend/components/ui/KpiCard";
import { SectionCard, Tag } from "@/frontend/components/ui/Bits";
import { ConfirmDialog, DetailDialog, FormDialog } from "@/frontend/components/ui/FormDialog";
import { ListField, SelectField, TextField, TextareaField } from "@/frontend/components/ui/Field";
import { RowActions } from "@/frontend/components/ui/RowActions";
import { StatusBadge } from "@/frontend/components/ui/StatusBadge";
import { CATALOGUE } from "@/shared/fixtures";
import type { Lesson } from "@/shared/types/learning.types";
import type { ProgramSlug } from "@/shared/types/school.types";
import { addDays, dateKey, nowIso, today, weekKeys } from "@/shared/utils/date.util";
import { newId, titleCase } from "@/shared/utils/common.util";
import { formatDateShort } from "@/frontend/utils/formatters";
import { cn } from "@/lib/utils";

const SLOTS: Lesson["slot"][] = ["MORNING", "MIDDAY", "AFTERNOON"];
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface Draft {
  title: string;
  date: string;
  slot: Lesson["slot"];
  objective: string;
  materials: string[];
  steps: string[];
  skillTags: string[];
  homework: string;
  status: Lesson["status"];
}

export function LessonPlanner() {
  const staffId = useStaffId();
  const { classroom } = useSelectedClass();
  const lessons = useErpStore((s) => s.lessons);
  const addItem = useErpStore((s) => s.addItem);
  const patchItem = useErpStore((s) => s.patchItem);
  const removeItem = useErpStore((s) => s.removeItem);

  const [weekOffset, setWeekOffset] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Lesson | null>(null);
  const [viewing, setViewing] = useState<Lesson | null>(null);
  const [deleting, setDeleting] = useState<Lesson | null>(null);
  const [draft, setDraft] = useState<Draft>({
    title: "",
    date: dateKey(today()),
    slot: "MORNING",
    objective: "",
    materials: [],
    steps: [],
    skillTags: [],
    homework: "",
    status: "PLANNED",
  });

  const days = weekKeys(addDays(today(), weekOffset * 7));
  const mine = lessons.filter((l) => !classroom || l.classroomId === classroom.id);
  const weekLessons = mine.filter((l) => days.includes(l.date));

  function openCreate(date?: string, slot?: Lesson["slot"]) {
    setEditing(null);
    setDraft({
      title: "",
      date: date ?? dateKey(today()),
      slot: slot ?? "MORNING",
      objective: "",
      materials: [],
      steps: [],
      skillTags: [],
      homework: "",
      status: "PLANNED",
    });
    setFormOpen(true);
  }

  function openEdit(l: Lesson) {
    setEditing(l);
    setDraft({
      title: l.title,
      date: l.date,
      slot: l.slot,
      objective: l.objective,
      materials: l.materials,
      steps: l.steps,
      skillTags: l.skillTags,
      homework: l.homework,
      status: l.status,
    });
    setFormOpen(true);
  }

  function save(): boolean {
    if (!draft.title.trim()) {
      toast.error("Give the lesson a title");
      return false;
    }
    const program: ProgramSlug = classroom?.programSlug ?? "nursery";
    if (editing) {
      patchItem("lessons", editing.id, { ...draft, title: draft.title.trim() });
      toast.success("Lesson updated");
    } else {
      addItem("lessons", {
        id: newId("lsn"),
        ...draft,
        title: draft.title.trim(),
        programSlug: program,
        classroomId: classroom?.id ?? null,
        authorStaffId: staffId,
        createdAt: nowIso(),
      });
      toast.success("Lesson planned");
    }
    return true;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Lesson planner"
        description={classroom ? `${classroom.name} · ${CATALOGUE.programs.find((p) => p.slug === classroom.programSlug)?.name}` : "Weekly plan"}
        crumbs={[{ label: "Teacher", href: "/teacher" }, { label: "Lessons" }]}
        actions={
          <>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" onClick={() => setWeekOffset((w) => w - 1)}>
                ←
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setWeekOffset(0)}>
                {weekOffset === 0 ? "This week" : `${weekOffset > 0 ? "+" : ""}${weekOffset} wk`}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setWeekOffset((w) => w + 1)}>
                →
              </Button>
            </div>
            <Button onClick={() => openCreate()}>
              <Plus /> New lesson
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="This week" value={weekLessons.length} accent="blue" icon={<BookOpen className="h-4 w-4" />} />
        <KpiCard label="Completed" value={weekLessons.filter((l) => l.status === "DONE").length} accent="green" />
        <KpiCard label="Planned" value={weekLessons.filter((l) => l.status === "PLANNED").length} accent="orange" />
        <KpiCard label="All lessons" value={mine.length} accent="navy" />
      </div>

      {/* week grid */}
      <div className="overflow-x-auto">
        <div className="grid min-w-[900px] grid-cols-7 gap-2">
          {days.map((day, i) => {
            const isToday = day === dateKey(today());
            return (
              <div key={day} className={cn("rounded-xl border p-2", isToday && "border-ck-red/40 bg-ck-red/5")}>
                <div className="mb-2 flex items-center justify-between px-1">
                  <span className="text-xs font-bold">{DAY_LABELS[i]}</span>
                  <span className={cn("text-[10px]", isToday ? "font-bold text-ck-red" : "text-muted-foreground")}>
                    {formatDateShort(day)}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {SLOTS.map((slot) => {
                    const lesson = weekLessons.find((l) => l.date === day && l.slot === slot);
                    if (!lesson) {
                      return (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => openCreate(day, slot)}
                          className="flex w-full items-center justify-center rounded-lg border border-dashed py-2 text-[10px] text-muted-foreground transition hover:border-ck-red/40 hover:text-ck-red"
                        >
                          + {slot.toLowerCase()}
                        </button>
                      );
                    }
                    return (
                      <div key={slot} className="rounded-lg border bg-card p-2">
                        <div className="flex items-start justify-between gap-1">
                          <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setViewing(lesson)}>
                            <p className="truncate text-xs font-semibold">{lesson.title}</p>
                            <p className="truncate text-[10px] text-muted-foreground">{slot.toLowerCase()}</p>
                          </button>
                          <RowActions
                            label="Lesson"
                            actions={[
                              { label: "Open", onSelect: () => setViewing(lesson) },
                              { label: "Edit", icon: <Pencil />, onSelect: () => openEdit(lesson) },
                              {
                                label: "Mark done",
                                icon: <Check />,
                                onSelect: () => {
                                  patchItem("lessons", lesson.id, { status: "DONE" });
                                  toast.success("Marked done");
                                },
                              },
                              {
                                label: "Skip",
                                icon: <SkipForward />,
                                onSelect: () => {
                                  patchItem("lessons", lesson.id, { status: "SKIPPED" });
                                  toast.success("Marked skipped");
                                },
                              },
                              {
                                label: "Duplicate to tomorrow",
                                icon: <Copy />,
                                separatorBefore: true,
                                onSelect: () => {
                                  addItem("lessons", {
                                    ...lesson,
                                    id: newId("lsn"),
                                    date: dateKey(addDays(lesson.date, 1)),
                                    status: "PLANNED",
                                    createdAt: nowIso(),
                                  });
                                  toast.success("Copied to the next day");
                                },
                              },
                              { label: "Delete", icon: <Trash2 />, destructive: true, onSelect: () => setDeleting(lesson) },
                            ]}
                          />
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          <StatusBadge status={lesson.status} className="text-[9px]" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* curriculum reference */}
      <SectionCard
        title="Curriculum units"
        description={`Reference plan for ${CATALOGUE.programs.find((p) => p.slug === (classroom?.programSlug ?? "nursery"))?.name}`}
      >
        <div className="grid gap-3 md:grid-cols-2">
          {CATALOGUE.curriculum
            .filter((c) => c.programSlug === (classroom?.programSlug ?? "nursery"))
            .map((unit) => (
              <div key={unit.id} className="rounded-xl border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{unit.title}</p>
                  <Badge variant="outline">Term {unit.term}</Badge>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {unit.focus} · {unit.weeks} weeks
                </p>
                <ul className="mt-1.5 space-y-0.5">
                  {unit.outcomes.map((o) => (
                    <li key={o} className="text-xs text-muted-foreground">
                      • {o}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
        </div>
      </SectionCard>

      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? "Edit lesson" : "Plan a lesson"}
        submitLabel={editing ? "Save" : "Add to plan"}
        onSubmit={save}
        size="lg"
      >
        <TextField label="Title" required value={draft.title} onChange={(v) => setDraft({ ...draft, title: v })} placeholder="Sound of the week: /s/" />
        <TextareaField label="Objective" rows={2} value={draft.objective} onChange={(v) => setDraft({ ...draft, objective: v })} placeholder="What should the children be able to do afterwards?" />
        <div className="grid gap-3 sm:grid-cols-3">
          <TextField label="Date" type="date" value={draft.date} onChange={(v) => setDraft({ ...draft, date: v })} />
          <SelectField
            label="Slot"
            value={draft.slot}
            onChange={(v) => setDraft({ ...draft, slot: v as Lesson["slot"] })}
            options={SLOTS.map((s) => ({ value: s, label: titleCase(s) }))}
          />
          <SelectField
            label="Status"
            value={draft.status}
            onChange={(v) => setDraft({ ...draft, status: v as Lesson["status"] })}
            options={["PLANNED", "IN_PROGRESS", "DONE", "SKIPPED"].map((s) => ({ value: s, label: titleCase(s) }))}
          />
        </div>
        <ListField label="Materials" values={draft.materials} onChange={(v) => setDraft({ ...draft, materials: v })} placeholder="Phonic cards, sock basket" />
        <ListField label="Steps" values={draft.steps} onChange={(v) => setDraft({ ...draft, steps: v })} placeholder="Puppet greeting, sound hunt, sorting" />
        <ListField label="Skill tags" values={draft.skillTags} onChange={(v) => setDraft({ ...draft, skillTags: v })} placeholder="language, cognitive" />
        <TextField label="Homework" value={draft.homework} onChange={(v) => setDraft({ ...draft, homework: v })} placeholder="Find three /s/ things at home" />
      </FormDialog>

      <DetailDialog
        open={!!viewing}
        onOpenChange={(o) => !o && setViewing(null)}
        title={viewing?.title ?? ""}
        description={viewing ? `${formatDateShort(viewing.date)} · ${viewing.slot.toLowerCase()}` : undefined}
        footer={
          viewing && (
            <>
              <Button variant="outline" onClick={() => setViewing(null)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  const l = viewing;
                  setViewing(null);
                  openEdit(l);
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
              <StatusBadge status={viewing.status} />
              {viewing.skillTags.map((t) => (
                <Tag key={t} tone="blue">
                  {t}
                </Tag>
              ))}
            </div>
            <p className="text-sm">{viewing.objective}</p>
            {viewing.materials.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-bold tracking-wide text-muted-foreground uppercase">Materials</p>
                <p className="text-sm text-muted-foreground">{viewing.materials.join(" · ")}</p>
              </div>
            )}
            {viewing.steps.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-bold tracking-wide text-muted-foreground uppercase">Steps</p>
                <ol className="space-y-1 text-sm">
                  {viewing.steps.map((s, i) => (
                    <li key={s} className="flex gap-2">
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-muted text-[10px] font-bold">
                        {i + 1}
                      </span>
                      {s}
                    </li>
                  ))}
                </ol>
              </div>
            )}
            {viewing.homework && (
              <div className="rounded-xl bg-ck-blue/10 p-3 text-sm">
                <p className="mb-1 text-xs font-bold tracking-wide text-sky-700 uppercase">Homework</p>
                {viewing.homework}
              </div>
            )}
          </>
        )}
      </DetailDialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete “${deleting?.title}”?`}
        confirmLabel="Delete lesson"
        onConfirm={() => {
          if (!deleting) return;
          removeItem("lessons", deleting.id);
          toast.success("Lesson deleted");
          setDeleting(null);
        }}
      />
    </div>
  );
}
