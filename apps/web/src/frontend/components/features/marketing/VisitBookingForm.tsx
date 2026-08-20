"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CalendarCheck, Clock, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useErpStore } from "@/frontend/store/erpStore";
import { SelectField, TextField, TextareaField } from "@/frontend/components/ui/Field";
import { addDays, dateKey, nowIso, today } from "@/shared/utils/date.util";
import { newId } from "@/shared/utils/common.util";
import { formatDateShort } from "@/frontend/utils/formatters";
import { cn } from "@/lib/utils";

const SLOTS = ["10:00", "10:30", "11:00", "11:30", "12:00", "16:00", "16:30", "17:00"];

/** Visit / video-counselling booking (SoW §7.5 visit-bookings + counseling). */
export function VisitBookingForm() {
  const branches = useErpStore((s) => s.branches);
  const existing = useErpStore((s) => s.visitBookings);
  const addItem = useErpStore((s) => s.addItem);

  const [booked, setBooked] = useState<{ date: string; slot: string } | null>(null);
  const [form, setForm] = useState({
    parentName: "",
    phone: "",
    email: "",
    branchId: "br_kathgola",
    childAge: "3",
    mode: "CAMPUS" as "CAMPUS" | "VIDEO",
    note: "",
  });
  const [date, setDate] = useState(dateKey(addDays(today(), 1)));
  const [slot, setSlot] = useState("");

  // Next 10 days, Sundays closed.
  const days = Array.from({ length: 10 }, (_, i) => addDays(today(), i + 1)).filter((d) => d.getDay() !== 0);

  function isTaken(d: string, s: string): boolean {
    return existing.some((v) => v.date === d && v.slot === s && v.status !== "CANCELLED" && v.branchId === form.branchId);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.parentName.trim() || !form.phone.trim()) {
      toast.error("Please add your name and phone number");
      return;
    }
    if (!slot) {
      toast.error("Pick a time slot");
      return;
    }
    addItem("visitBookings", {
      id: newId("vb"),
      parentName: form.parentName.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      branchId: form.branchId,
      date,
      slot,
      childAge: Number(form.childAge) || 3,
      mode: form.mode,
      status: "REQUESTED",
      note: form.note.trim(),
      createdAt: nowIso(),
    });
    setBooked({ date, slot });
    toast.success("Visit requested — we'll confirm by phone");
  }

  if (booked) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border bg-card p-8 text-center">
        <CalendarCheck className="mx-auto h-14 w-14 text-ck-green" />
        <h2 className="mt-3 font-[family-name:var(--font-fredoka)] text-2xl font-bold text-ck-navy">
          Visit requested
        </h2>
        <p className="mt-2 text-sm text-ck-navy/70">
          {formatDateShort(booked.date)} at {booked.slot} ·{" "}
          {form.mode === "VIDEO" ? "video walkthrough" : branches.find((b) => b.id === form.branchId)?.name}
        </p>
        <p className="mt-2 text-sm text-ck-navy/70">
          The office will call {form.phone} to confirm. Bring your child if you can — the best visits are the noisy ones.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button asChild className="rounded-xl font-bold">
            <Link href="/admissions/apply">Start an application</Link>
          </Button>
          <Button variant="outline" className="rounded-xl font-bold" onClick={() => setBooked(null)}>
            Book another slot
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-2xl space-y-5">
      <div className="rounded-3xl border bg-card p-5 sm:p-6">
        <h2 className="font-[family-name:var(--font-fredoka)] text-xl font-bold text-ck-navy">Your details</h2>
        <div className="mt-3 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="Parent's name" required value={form.parentName} onChange={(v) => setForm({ ...form, parentName: v })} />
            <TextField label="Phone" required type="tel" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
            <TextField label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
            <TextField label="Child's age (years)" type="number" step={0.5} value={form.childAge} onChange={(v) => setForm({ ...form, childAge: v })} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField
              label="Which campus"
              value={form.branchId}
              onChange={(v) => {
                setForm({ ...form, branchId: v });
                setSlot("");
              }}
              options={branches.map((b) => ({ value: b.id, label: b.name.replace("Climb Kiddo — ", "") }))}
            />
            <SelectField
              label="How would you like to visit?"
              value={form.mode}
              onChange={(v) => setForm({ ...form, mode: v as "CAMPUS" | "VIDEO" })}
              options={[
                { value: "CAMPUS", label: "In person at the campus" },
                { value: "VIDEO", label: "Video walkthrough" },
              ]}
            />
          </div>
        </div>
      </div>

      <div className="rounded-3xl border bg-card p-5 sm:p-6">
        <h2 className="flex items-center gap-2 font-[family-name:var(--font-fredoka)] text-xl font-bold text-ck-navy">
          <Clock className="h-5 w-5 text-ck-red" /> Pick a day and time
        </h2>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
          {days.map((d) => {
            const key = dateKey(d);
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setDate(key);
                  setSlot("");
                }}
                className={cn(
                  "flex min-w-16 shrink-0 flex-col items-center rounded-2xl border-2 px-3 py-2 transition",
                  date === key ? "border-ck-red bg-ck-red/5" : "border-border hover:bg-muted",
                )}
              >
                <span className="text-[10px] font-bold tracking-wide text-ck-navy/50 uppercase">
                  {d.toLocaleDateString("en-IN", { weekday: "short" })}
                </span>
                <span className="font-[family-name:var(--font-fredoka)] text-lg font-bold text-ck-navy">
                  {d.getDate()}
                </span>
                <span className="text-[10px] text-ck-navy/50">
                  {d.toLocaleDateString("en-IN", { month: "short" })}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {SLOTS.map((s) => {
            const taken = isTaken(date, s);
            return (
              <button
                key={s}
                type="button"
                disabled={taken}
                onClick={() => setSlot(s)}
                className={cn(
                  "rounded-xl border-2 py-2.5 text-sm font-bold transition",
                  taken && "cursor-not-allowed border-dashed text-muted-foreground opacity-50",
                  !taken && slot === s && "border-ck-red bg-ck-red text-white",
                  !taken && slot !== s && "border-border hover:border-ck-red/40 hover:bg-muted",
                )}
              >
                {s}
                {taken && <span className="ml-1 text-[10px]">full</span>}
              </button>
            );
          })}
        </div>

        <TextareaField
          className="mt-4"
          label="Anything else?"
          rows={2}
          value={form.note}
          onChange={(v) => setForm({ ...form, note: v })}
          placeholder="We'll bring our daughter along."
        />

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-ck-navy/60">
            {form.mode === "VIDEO" ? <Video className="h-4 w-4" /> : <CalendarCheck className="h-4 w-4" />}
            {slot ? (
              <span>
                {formatDateShort(date)} at {slot}
              </span>
            ) : (
              <span>No slot selected</span>
            )}
            <Badge variant="outline">{form.mode === "VIDEO" ? "Video" : "Campus"}</Badge>
          </div>
          <Button type="submit" className="rounded-xl px-6 py-5 font-bold">
            Request this slot
          </Button>
        </div>
      </div>
    </form>
  );
}
