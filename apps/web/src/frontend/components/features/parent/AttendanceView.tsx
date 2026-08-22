"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CalendarDays, LogIn, LogOut, Moon, QrCode, Smile, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useErpStore } from "@/frontend/store/erpStore";
import { useSession } from "@/frontend/store/session";
import { useSelectedChild } from "@/frontend/hooks/useSelection";
import { attendanceFor, attendanceRate, weeklyAttendanceSeries } from "@/frontend/store/queries";
import { PageHeader } from "@/frontend/components/ui/PageHeader";
import { KpiCard } from "@/frontend/components/ui/KpiCard";
import { SectionCard, InfoItem } from "@/frontend/components/ui/Bits";
import { BarChart, RadialStat } from "@/frontend/components/ui/Charts";
import { StatusBadge } from "@/frontend/components/ui/StatusBadge";
import { FormDialog } from "@/frontend/components/ui/FormDialog";
import { TextField } from "@/frontend/components/ui/Field";
import { EmptyState } from "@/frontend/components/ui/EmptyState";
import { addDays, dateKey, today } from "@/shared/utils/date.util";
import { newId } from "@/shared/utils/common.util";
import { formatDate, formatTime } from "@/frontend/utils/formatters";
import { cn } from "@/lib/utils";
import { CoverageNote } from "@/frontend/components/ui/CoverageNote";

const MOOD_EMOJI: Record<string, string> = {
  HAPPY: "😄",
  CALM: "🙂",
  SLEEPY: "😴",
  FUSSY: "😖",
  UNWELL: "🤒",
};

const STATUS_DOT: Record<string, string> = {
  PRESENT: "bg-ck-green",
  LATE: "bg-ck-orange",
  ABSENT: "bg-ck-red",
  HALF_DAY: "bg-ck-blue",
  UNMARKED: "bg-muted",
};

export function AttendanceView() {
  const session = useSession();
  const { child } = useSelectedChild();
  const attendance = useErpStore((s) => s.attendance);
  const pickups = useErpStore((s) => s.pickupAuthorizations);
  const addItem = useErpStore((s) => s.addItem);

  const [pickupOpen, setPickupOpen] = useState(false);
  const [pickup, setPickup] = useState({ person: "", relation: "Grandparent", phone: "" });
  const [monthOffset, setMonthOffset] = useState(0);

  if (!child) return <EmptyState emoji="👶" title="No child linked to this account" />;

  const rows = attendance
    .filter((a) => a.studentId === child.id)
    .sort((a, b) => b.date.localeCompare(a.date));
  const todayRec = attendanceFor(attendance, child.id, dateKey(today()));
  const present = rows.filter((r) => r.status === "PRESENT" || r.status === "LATE").length;
  const absent = rows.filter((r) => r.status === "ABSENT").length;
  const late = rows.filter((r) => r.status === "LATE").length;

  // 28-day grid ending today (or offset months back).
  const gridDays = Array.from({ length: 28 }, (_, i) => dateKey(addDays(today(), -(27 - i) + monthOffset * 28)));
  const myPickups = pickups.filter((p) => p.studentId === child.id);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Attendance"
        description={`Check-in and check-out log for ${child.firstName}, plus the daily report.`}
        crumbs={[{ label: "Parent", href: "/parent" }, { label: "Attendance" }]}
        actions={
          <Button variant="outline" onClick={() => setPickupOpen(true)}>
            <QrCode /> Authorise a pickup
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Attendance" value={`${attendanceRate(attendance, child.id)}%`} accent="green" icon={<CalendarDays className="h-4 w-4" />} />
        <KpiCard label="Days present" value={present} accent="blue" />
        <KpiCard label="Absences" value={absent} accent={absent ? "brand" : "muted"} />
        <KpiCard label="Late arrivals" value={late} accent={late ? "orange" : "muted"} />
      </div>
      {/* Days present, absences and lateness are counts within the window the
          portal loaded — not since the child joined the school. */}
      <CoverageNote collection="attendance" noun="These counts" />

      {/* today */}
      <SectionCard title="Today" description={formatDate(today())}>
        {!todayRec || todayRec.status === "UNMARKED" ? (
          <p className="py-3 text-center text-sm text-muted-foreground">
            Not marked yet — the class teacher marks attendance by 9:30 AM.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border p-3">
              <p className="text-xs tracking-wide text-muted-foreground uppercase">Status</p>
              <div className="mt-1">
                <StatusBadge status={todayRec.status} />
              </div>
            </div>
            <div className="rounded-xl border p-3">
              <p className="flex items-center gap-1 text-xs tracking-wide text-muted-foreground uppercase">
                <LogIn className="h-3 w-3" /> Checked in
              </p>
              <p className="mt-1 font-heading text-lg font-bold">
                {todayRec.checkInAt ? formatTime(todayRec.checkInAt) : "—"}
              </p>
            </div>
            <div className="rounded-xl border p-3">
              <p className="flex items-center gap-1 text-xs tracking-wide text-muted-foreground uppercase">
                <LogOut className="h-3 w-3" /> Checked out
              </p>
              <p className="mt-1 font-heading text-lg font-bold">
                {todayRec.checkOutAt ? formatTime(todayRec.checkOutAt) : "—"}
              </p>
              {todayRec.pickedUpBy && <p className="text-xs text-muted-foreground">by {todayRec.pickedUpBy}</p>}
            </div>
            <div className="rounded-xl border p-3">
              <p className="flex items-center gap-1 text-xs tracking-wide text-muted-foreground uppercase">
                <Smile className="h-3 w-3" /> Mood
              </p>
              <p className="mt-1 font-heading text-lg font-bold">
                {todayRec.mood ? `${MOOD_EMOJI[todayRec.mood]} ${todayRec.mood.toLowerCase()}` : "—"}
              </p>
            </div>
            {(todayRec.mealsEaten || todayRec.napMinutes !== null) && (
              <div className="rounded-xl border p-3 sm:col-span-2">
                <div className="grid grid-cols-2 gap-3">
                  <InfoItem
                    label="Meals"
                    value={
                      <span className="flex items-center gap-1.5">
                        <Utensils className="h-3.5 w-3.5" /> {todayRec.mealsEaten?.toLowerCase() ?? "—"}
                      </span>
                    }
                  />
                  <InfoItem
                    label="Nap"
                    value={
                      <span className="flex items-center gap-1.5">
                        <Moon className="h-3.5 w-3.5" /> {todayRec.napMinutes ?? 0} min
                      </span>
                    }
                  />
                </div>
              </div>
            )}
            {todayRec.note && (
              <div className="rounded-xl bg-muted/50 p-3 text-sm sm:col-span-2">
                <p className="mb-1 text-xs font-bold tracking-wide text-muted-foreground uppercase">Teacher&apos;s note</p>
                {todayRec.note}
              </div>
            )}
          </div>
        )}
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        {/* calendar grid */}
        <SectionCard
          title="Last four weeks"
          action={
            <div className="flex items-center gap-1">
              <Button size="xs" variant="outline" onClick={() => setMonthOffset((m) => m - 1)}>
                ←
              </Button>
              <Button size="xs" variant="ghost" onClick={() => setMonthOffset(0)}>
                {monthOffset === 0 ? "Now" : `${monthOffset * 28}d`}
              </Button>
              <Button size="xs" variant="outline" disabled={monthOffset >= 0} onClick={() => setMonthOffset((m) => m + 1)}>
                →
              </Button>
            </div>
          }
        >
          <div className="grid grid-cols-7 gap-1.5">
            {gridDays.map((day) => {
              const rec = rows.find((r) => r.date === day);
              const status = rec?.status ?? "UNMARKED";
              return (
                <div
                  key={day}
                  title={`${formatDate(day)} — ${status.toLowerCase()}`}
                  className="flex flex-col items-center gap-1 rounded-lg border p-1.5"
                >
                  <span className="text-[10px] text-muted-foreground">{day.slice(8)}</span>
                  <span className={cn("h-2.5 w-2.5 rounded-full", STATUS_DOT[status])} />
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
            {[
              ["Present", "bg-ck-green"],
              ["Late", "bg-ck-orange"],
              ["Absent", "bg-ck-red"],
              ["Not marked", "bg-muted"],
            ].map(([label, cls]) => (
              <span key={label} className="flex items-center gap-1.5">
                <span className={cn("h-2 w-2 rounded-full", cls)} /> {label}
              </span>
            ))}
          </div>
          <div className="mt-4">
            <BarChart data={weeklyAttendanceSeries(attendance, child.id)} suffix="%" color="#8BC53F" height={140} />
          </div>
        </SectionCard>

        <div className="space-y-4">
          <SectionCard title="Overall">
            <div className="flex justify-center">
              <RadialStat value={attendanceRate(attendance, child.id)} label="This term" color="#8BC53F" />
            </div>
          </SectionCard>

          <SectionCard title="Pickup codes" description="Single-use, valid for one day">
            {myPickups.length === 0 ? (
              <p className="py-3 text-center text-sm text-muted-foreground">
                None yet. Create one when someone else is collecting.
              </p>
            ) : (
              <ul className="space-y-2">
                {myPickups.map((p) => (
                  <li key={p.id} className="rounded-xl border p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{p.personName}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {p.relation} · {formatDate(p.validOn)}
                        </p>
                      </div>
                      <Badge variant={p.used ? "outline" : "default"} className="font-mono">
                        {p.code}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>

      {/* recent log */}
      <SectionCard title="Full log" description="Newest first">
        <ul className="divide-y">
          {rows.slice(0, 14).map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium">{formatDate(r.date)}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {r.checkInAt ? `In ${formatTime(r.checkInAt)}` : "—"}
                  {r.checkOutAt ? ` · Out ${formatTime(r.checkOutAt)}` : ""}
                  {r.pickedUpBy ? ` · ${r.pickedUpBy}` : ""}
                  {r.note ? ` · ${r.note}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {r.mood && <span aria-hidden>{MOOD_EMOJI[r.mood]}</span>}
                <StatusBadge status={r.status} />
              </div>
            </li>
          ))}
        </ul>
      </SectionCard>

      <FormDialog
        open={pickupOpen}
        onOpenChange={setPickupOpen}
        title="Authorise a pickup"
        description="We'll generate a one-time code. The person shows it at the gate along with a photo ID."
        submitLabel="Generate code"
        onSubmit={() => {
          if (!pickup.person.trim()) {
            toast.error("Who is collecting your child?");
            return false;
          }
          const code = `${Math.floor(100000 + Math.random() * 899999)}`;
          addItem("pickupAuthorizations", {
            id: newId("pk"),
            studentId: child.id,
            personName: pickup.person.trim(),
            relation: pickup.relation,
            phone: pickup.phone,
            code,
            validOn: dateKey(today()),
            used: false,
            createdByUserId: session.id,
            createdAt: new Date().toISOString(),
          });
          toast.success(`Code ${code} created — share it with ${pickup.person.trim()}`);
          setPickup({ person: "", relation: "Grandparent", phone: "" });
          return true;
        }}
        size="sm"
      >
        <TextField label="Person collecting" required value={pickup.person} onChange={(v) => setPickup({ ...pickup, person: v })} />
        <TextField label="Relation to child" value={pickup.relation} onChange={(v) => setPickup({ ...pickup, relation: v })} />
        <TextField label="Their phone" type="tel" value={pickup.phone} onChange={(v) => setPickup({ ...pickup, phone: v })} />
      </FormDialog>
    </div>
  );
}
