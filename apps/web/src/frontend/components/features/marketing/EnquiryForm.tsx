"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useErpStore } from "@/frontend/store/erpStore";
import { SelectField, TextField, TextareaField } from "@/frontend/components/ui/Field";
import { CATALOGUE } from "@/shared/fixtures";
import type { ProgramSlug } from "@/shared/types/school.types";
import { newId } from "@/shared/utils/common.util";
import { nowIso } from "@/shared/utils/date.util";
import { cn } from "@/lib/utils";

/**
 * Public enquiry capture (SoW §7.18 `POST /api/public/contact`). Today it writes
 * straight into the demo store, which is exactly what the admissions pipeline
 * reads — so a website enquiry really does appear in /admin/admissions.
 */
export function EnquiryForm({
  compact = false,
  heading = "Book a free visit",
  blurb = "We reply within the hour, 9 am – 8 pm.",
  className,
}: {
  compact?: boolean;
  heading?: string;
  blurb?: string;
  className?: string;
}) {
  const branches = useErpStore((s) => s.branches);
  const addItem = useErpStore((s) => s.addItem);

  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    parentName: "",
    phone: "",
    email: "",
    childName: "",
    childAge: "",
    programSlug: "nursery" as ProgramSlug,
    branchId: "br_kathgola",
    message: "",
  });

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.parentName.trim() || !form.phone.trim()) {
      toast.error("Please add your name and phone number");
      return;
    }
    setBusy(true);
    const months = Math.round((Number(form.childAge) || 3) * 12);
    addItem("inquiries", {
      id: newId("inq"),
      parentName: form.parentName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      childName: form.childName.trim(),
      childDob: new Date(Date.now() - months * 30.4 * 86_400_000).toISOString(),
      programSlug: form.programSlug,
      branchId: form.branchId,
      source: "WEBSITE",
      stage: "NEW",
      message: form.message.trim(),
      assignedToStaffId: null,
      followUpOn: null,
      notes: [],
      createdAt: nowIso(),
    });
    setBusy(false);
    setSent(true);
    toast.success("Thank you! We'll call you back within the hour.", {
      description: "Your enquiry is now with our admissions team.",
    });
  }

  if (sent) {
    return (
      <div className={cn("rounded-3xl bg-white p-8 text-center text-ck-navy shadow-xl", className)}>
        <CheckCircle2 className="mx-auto h-12 w-12 text-ck-green" />
        <p className="mt-3 font-[family-name:var(--font-fredoka)] text-2xl font-bold">Enquiry received!</p>
        <p className="mt-2 text-sm text-ck-navy/70">
          We&apos;ve logged it for {form.childName || "your child"} and someone from the office will call{" "}
          {form.phone} shortly.
        </p>
        <Button
          variant="outline"
          className="mt-5 rounded-xl font-bold"
          onClick={() => {
            setSent(false);
            setForm({ ...form, parentName: "", phone: "", email: "", childName: "", message: "" });
          }}
        >
          Send another enquiry
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className={cn("rounded-3xl bg-white p-6 text-ck-navy shadow-xl sm:p-8", className)}>
      <p className="font-[family-name:var(--font-fredoka)] text-2xl font-bold">{heading}</p>
      <p className="mt-1 text-sm text-ck-navy/60">{blurb}</p>

      <div className="mt-5 space-y-3">
        <TextField label="Parent's name" required value={form.parentName} onChange={(v) => set("parentName", v)} placeholder="Riya Sharma" />
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Phone" required type="tel" value={form.phone} onChange={(v) => set("phone", v)} placeholder="+91 90000 00000" />
          <TextField label="Email" type="email" value={form.email} onChange={(v) => set("email", v)} placeholder="you@example.com" />
        </div>
        {!compact && (
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="Child's name" value={form.childName} onChange={(v) => set("childName", v)} placeholder="Aarav" />
            <TextField label="Child's age (years)" type="number" step={0.5} value={form.childAge} onChange={(v) => set("childAge", v)} placeholder="2.5" />
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            label="Interested in"
            value={form.programSlug}
            onChange={(v) => set("programSlug", v as ProgramSlug)}
            options={CATALOGUE.programs.map((p) => ({ value: p.slug, label: `${p.emoji} ${p.name}` }))}
          />
          <SelectField
            label="Branch"
            value={form.branchId}
            onChange={(v) => set("branchId", v)}
            options={branches.map((b) => ({ value: b.id, label: b.name.replace("Climb Kiddo — ", "") }))}
          />
        </div>
        {!compact && (
          <TextareaField
            label="Anything you'd like to tell us?"
            rows={3}
            value={form.message}
            onChange={(v) => set("message", v)}
            placeholder="We're looking for a warm, small-batch playschool near Beleghata…"
          />
        )}

        <Button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-ck-red py-6 text-base font-bold shadow-[0_6px_0_#9a1a28] transition-all hover:translate-y-[3px] hover:bg-ck-red/90 hover:shadow-[0_3px_0_#9a1a28]"
        >
          <Send className="mr-2 h-4 w-4" /> {busy ? "Sending…" : "Send my enquiry"}
        </Button>
        <p className="text-center text-[11px] text-ck-navy/50">
          We never share your details. You can ask us to delete them at any time.
        </p>
      </div>
    </form>
  );
}
