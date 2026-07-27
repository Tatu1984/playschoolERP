"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  CalendarDays,
  Check,
  CheckCheck,
  Clock,
  LogOut,
  QrCode,
  Smile,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useErpStore } from "@/frontend/store/erpStore";
import { useSelectedClass } from "@/frontend/hooks/useSelection";
import { attendanceFor, rosterOf, studentName } from "@/frontend/store/queries";
import { PageHeader } from "@/frontend/components/ui/PageHeader";
import { KpiCard } from "@/frontend/components/ui/KpiCard";
import { SectionCard, EmojiAvatar, InfoItem } from "@/frontend/components/ui/Bits";
import { StatusBadge } from "@/frontend/components/ui/StatusBadge";
import { FormDialog } from "@/frontend/components/ui/FormDialog";
import { SelectField, TextField, TextareaField } from "@/frontend/components/ui/Field";
import { RowActions } from "@/frontend/components/ui/RowActions";
import { EmptyState } from "@/frontend/components/ui/EmptyState";
import type { AttendanceStatus, ChildMood, Student } from "@/shared/types/school.types";
import { dateKey, today } from "@/shared/utils/date.util";
import { newId } from "@/shared/utils/common.util";
import { formatDate, formatTime } from "@/frontend/utils/formatters";
import { cn } from "@/lib/utils";

const MOODS: { value: ChildMood; label: string; emoji: string }[] = [
  { value: "HAPPY", label: "Happy", emoji: "😄" },
  { value: "CALM", label: "Calm", emoji: "🙂" },
  { value: "SLEEPY", label: "Sleepy", emoji: "😴" },
  { value: "FUSSY", label: "Fussy", emoji: "😖" },
  { value: "UNWELL", label: "Unwell", emoji: "🤒" },
];

export function AttendanceMarker() {
  const { classroom } = useSelectedClass();
  const students = useErpStore((s) => s.students);
  const guardians = useErpStore((s) => s.guardians);
  const attendance = useErpStore((s) => s.attendance);
  const markAttendance = useErpStore((s) => s.markAttendance);
  const bulkMark = useErpStore((s) => s.bulkMarkAttendance);
  const checkOut = useErpStore((s) => s.checkOut);
  const updateDayLog = useErpStore((s) => s.updateDayLog);
  const addItem = useErpStore((s) => s.addItem);

  const [date, setDate] = useState(dateKey(today()));
  const [logFor, setLogFor] = useState<Student | null>(null);
  const [log, setLog] = useState({ mood: "HAPPY" as ChildMood, meals: "ALL", nap: "45", note: "" });
  const [pickupFor, setPickupFor] = useState<Student | null>(null);
  const [pickup, setPickup] = useState({ person: "", relation: "Mother", phone: "" });

  const roster = classroom ? rosterOf(students, classroom.id) : [];
  const stats = {
    present: roster.filter((s) => attendanceFor(attendance, s.id, date)?.status === "PRESENT").length,
    late: roster.filter((s) => attendanceFor(attendance, s.id, date)?.status === "LATE").length,
    absent: roster.filter((s) => attendanceFor(attendance, s.id, date)?.status === "ABSENT").length,
    unmarked: roster.filter((s) => {
      const st = attendanceFor(attendance, s.id, date)?.status;
      return !st || st === "UNMARKED";
    }).length,
  };

  function mark(student: Student, status: AttendanceStatus) {
    if (!classroom) return;
    markAttendance(student.id, classroom.id, status, date);
  }

  function openLog(student: Student) {
    const rec = attendanceFor(attendance, student.id, date);
    setLog({
      mood: rec?.mood ?? "HAPPY",
      meals: rec?.mealsEaten ?? "ALL",
      nap: `${rec?.napMinutes ?? 45}`,
      note: rec?.note ?? "",
    });
    setLogFor(student);
  }

  if (!classroom) {
    return <EmptyState emoji="🏫" title="No class assigned" description="Ask an admin to assign you a classroom." />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Attendance"
        description={`${classroom.name} · ${formatDate(date)}`}
        crumbs={[{ label: "Teacher", href: "/teacher" }, { label: "Attendance" }]}
        actions={
          <>
            <div className="w-40">
              <TextField type="date" value={date} onChange={setDate} />
            </div>
            <Button
              variant="outline"
              onClick={() => {
                bulkMark(classroom.id, "PRESENT", date);
                toast.success(`All ${roster.length} children marked present`);
              }}
            >
              <CheckCheck /> All present
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Present" value={stats.present} accent="green" />
        <KpiCard label="Late" value={stats.late} accent="orange" icon={<Clock className="h-4 w-4" />} />
        <KpiCard label="Absent" value={stats.absent} accent="brand" />
        <KpiCard label="Unmarked" value={stats.unmarked} accent={stats.unmarked ? "navy" : "muted"} icon={<CalendarDays className="h-4 w-4" />} />
      </div>

      <SectionCard
        title={`Roster (${roster.length})`}
        description="Set a status, then log mood, meals and nap for the day report parents see."
      >
        {roster.length === 0 ? (
          <EmptyState emoji="🧒" title="No children in this class" />
        ) : (
          <ul className="divide-y">
            {roster.map((student) => {
              const rec = attendanceFor(attendance, student.id, date);
              const status = rec?.status ?? "UNMARKED";
              const guardian = guardians.find((g) => student.guardianIds.includes(g.id));
              return (
                <li key={student.id} className="flex flex-wrap items-center gap-3 py-3">
                  <EmojiAvatar emoji={student.photoEmoji} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{studentName(student)}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {rec?.checkInAt ? `In ${formatTime(rec.checkInAt)}` : "Not checked in"}
                      {rec?.checkOutAt ? ` · Out ${formatTime(rec.checkOutAt)}` : ""}
                      {rec?.pickedUpBy ? ` · ${rec.pickedUpBy}` : ""}
                    </p>
                  </div>

                  {rec?.mood && (
                    <Badge variant="outline" className="hidden sm:inline-flex">
                      {MOODS.find((m) => m.value === rec.mood)?.emoji} {rec.mood.toLowerCase()}
                    </Badge>
                  )}

                  <div className="flex items-center gap-1">
                    {(
                      [
                        ["PRESENT", <Check key="p" className="h-3.5 w-3.5" />, "green"],
                        ["LATE", <Clock key="l" className="h-3.5 w-3.5" />, "orange"],
                        ["ABSENT", <X key="a" className="h-3.5 w-3.5" />, "red"],
                      ] as const
                    ).map(([value, icon, tone]) => (
                      <button
                        key={value}
                        type="button"
                        aria-label={`Mark ${value.toLowerCase()}`}
                        onClick={() => mark(student, value)}
                        className={cn(
                          "grid h-8 w-8 place-items-center rounded-lg border transition",
                          status === value
                            ? tone === "green"
                              ? "border-ck-green bg-ck-green text-white"
                              : tone === "orange"
                                ? "border-ck-orange bg-ck-orange text-white"
                                : "border-ck-red bg-ck-red text-white"
                            : "hover:bg-muted",
                        )}
                      >
                        {icon}
                      </button>
                    ))}
                    <StatusBadge status={status} className="ml-1 hidden sm:inline-flex" />
                    <RowActions
                      label="Child actions"
                      actions={[
                        { label: "Log mood / meals / nap", icon: <Smile />, onSelect: () => openLog(student) },
                        {
                          label: "Check out",
                          icon: <LogOut />,
                          disabled: !rec?.checkInAt || !!rec?.checkOutAt,
                          onSelect: () => {
                            checkOut(student.id, guardian?.name ?? "Guardian");
                            toast.success(`${student.firstName} checked out`);
                          },
                        },
                        {
                          label: "Authorise a pickup",
                          icon: <QrCode />,
                          onSelect: () => {
                            setPickup({ person: "", relation: "Mother", phone: guardian?.phone ?? "" });
                            setPickupFor(student);
                          },
                        },
                        {
                          label: "Mark half day",
                          separatorBefore: true,
                          onSelect: () => {
                            mark(student, "HALF_DAY");
                            toast.success("Marked half day");
                          },
                        },
                      ]}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>

      {/* day log */}
      <FormDialog
        open={!!logFor}
        onOpenChange={(o) => !o && setLogFor(null)}
        title={logFor ? `Day log — ${logFor.firstName}` : ""}
        description="Parents see this in the daily report."
        submitLabel="Save log"
        onSubmit={() => {
          if (!logFor) return false;
          updateDayLog(logFor.id, date, {
            mood: log.mood,
            mealsEaten: log.meals as "ALL" | "MOST" | "SOME" | "NONE",
            napMinutes: Number(log.nap) || 0,
            note: log.note,
          });
          toast.success(`${logFor.firstName}'s day log saved`);
          setLogFor(null);
          return true;
        }}
      >
        <div>
          <p className="mb-1.5 text-xs font-bold tracking-wide text-muted-foreground uppercase">Mood</p>
          <div className="flex flex-wrap gap-2">
            {MOODS.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setLog((l) => ({ ...l, mood: m.value }))}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm transition",
                  log.mood === m.value ? "border-ck-red bg-ck-red/10 font-semibold text-ck-red" : "hover:bg-muted",
                )}
              >
                <span aria-hidden>{m.emoji}</span>
                {m.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            label="Meals eaten"
            value={log.meals}
            onChange={(v) => setLog((l) => ({ ...l, meals: v }))}
            options={[
              { value: "ALL", label: "Everything" },
              { value: "MOST", label: "Most of it" },
              { value: "SOME", label: "A little" },
              { value: "NONE", label: "Nothing" },
            ]}
          />
          <TextField label="Nap (minutes)" type="number" value={log.nap} onChange={(v) => setLog((l) => ({ ...l, nap: v }))} />
        </div>
        <TextareaField
          label="Note for parents"
          rows={3}
          value={log.note}
          onChange={(v) => setLog((l) => ({ ...l, note: v }))}
          placeholder="Had a wonderful day at the water table."
        />
      </FormDialog>

      {/* pickup authorisation */}
      <FormDialog
        open={!!pickupFor}
        onOpenChange={(o) => !o && setPickupFor(null)}
        title={pickupFor ? `Pickup code — ${pickupFor.firstName}` : ""}
        description="Generates a single-use code for today. The person shows it at the gate."
        submitLabel="Generate code"
        onSubmit={() => {
          if (!pickupFor) return false;
          if (!pickup.person.trim()) {
            toast.error("Who is collecting the child?");
            return false;
          }
          const code = `${Math.floor(100000 + Math.random() * 899999)}`;
          addItem("pickupAuthorizations", {
            id: newId("pk"),
            studentId: pickupFor.id,
            personName: pickup.person.trim(),
            relation: pickup.relation,
            phone: pickup.phone,
            code,
            validOn: date,
            used: false,
            createdByUserId: "teacher",
            createdAt: new Date().toISOString(),
          });
          toast.success(`Code ${code} sent to the parent`);
          setPickupFor(null);
          return true;
        }}
        size="sm"
      >
        <TextField label="Person collecting" required value={pickup.person} onChange={(v) => setPickup((p) => ({ ...p, person: v }))} />
        <TextField label="Relation" value={pickup.relation} onChange={(v) => setPickup((p) => ({ ...p, relation: v }))} />
        <TextField label="Phone" type="tel" value={pickup.phone} onChange={(v) => setPickup((p) => ({ ...p, phone: v }))} />
        {pickupFor && (
          <div className="grid grid-cols-2 gap-3 rounded-xl border p-3">
            <InfoItem label="Child" value={studentName(pickupFor)} />
            <InfoItem label="Valid on" value={formatDate(date)} />
          </div>
        )}
      </FormDialog>
    </div>
  );
}
