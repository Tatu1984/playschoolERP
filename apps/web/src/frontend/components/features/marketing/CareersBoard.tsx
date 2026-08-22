"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Briefcase, Clock, MapPin, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { FormDialog } from "@/frontend/components/ui/FormDialog";
import { ListField, SelectField, TextField, TextareaField } from "@/frontend/components/ui/Field";

interface Opening {
  id: string;
  title: string;
  branch: string;
  type: "Full-time" | "Part-time" | "Contract";
  experience: string;
  summary: string;
  responsibilities: string[];
  requirements: string[];
}

const OPENINGS: Opening[] = [
  {
    id: "op_nursery",
    title: "Class Teacher — Nursery",
    branch: "Kathgola",
    type: "Full-time",
    experience: "2+ years",
    summary:
      "Lead a batch of sixteen 2.5–3.5 year olds with an assistant. Own the phonics and early-numeracy plan for the term.",
    responsibilities: [
      "Plan and run daily lessons from the curriculum framework",
      "Post a daily update to parents (photos + a few honest lines)",
      "Run the termly parent meeting for your class",
      "Log attendance, mood, meals and naps every day",
    ],
    requirements: ["B.Ed / NTT / Montessori diploma", "Fluent English + Bengali or Hindi", "Patience under pressure"],
  },
  {
    id: "op_caregiver",
    title: "Caregiver — Toddlers",
    branch: "Dhakuria",
    type: "Full-time",
    experience: "Freshers welcome",
    summary:
      "Support the lead teacher in the toddler room: feeding, nappies, naps, cuddles and an enormous amount of cleaning up.",
    responsibilities: ["Support meal and nap routines", "Keep the room safe and sanitised", "Comfort new joiners"],
    requirements: ["Class 12 or above", "Warm with very young children", "Willing to be trained"],
  },
  {
    id: "op_dance",
    title: "Dance & Movement Coach",
    branch: "Both campuses",
    type: "Part-time",
    experience: "1+ years",
    summary: "Two afternoons a week plus annual-day choreography for 40 children who mostly face the wrong way.",
    responsibilities: ["Weekly movement classes", "Annual day choreography", "Costume coordination"],
    requirements: ["Performing-arts training", "Experience with under-6s", "Boundless energy"],
  },
  {
    id: "op_admin",
    title: "Front Desk & Admissions Executive",
    branch: "Kathgola",
    type: "Full-time",
    experience: "1+ years",
    summary: "First voice a parent hears. Handle enquiries, visits, fee follow-ups and the pickup queue.",
    responsibilities: ["Answer enquiries within the hour", "Schedule and host campus visits", "Fee reminders and receipts"],
    requirements: ["Graduate", "Comfortable with software", "Genuinely likes people"],
  },
];

/** Careers board with a working application dialog (stored client-side for now). */
export function CareersBoard() {
  const [applyFor, setApplyFor] = useState<Opening | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", experience: "", skills: [] as string[], note: "" });

  return (
    <div className="space-y-4">
      {OPENINGS.map((job) => (
        <Card key={job.id} className="rounded-3xl border-ck-cream">
          <CardContent className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-[family-name:var(--font-fredoka)] text-xl font-bold text-ck-navy">{job.title}</h3>
                <div className="mt-1.5 flex flex-wrap gap-3 text-xs font-bold text-ck-navy/75">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {job.branch}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> {job.type}
                  </span>
                  <span className="flex items-center gap-1">
                    <Briefcase className="h-3.5 w-3.5" /> {job.experience}
                  </span>
                </div>
              </div>
              <Button className="rounded-xl font-bold" onClick={() => setApplyFor(job)}>
                Apply
              </Button>
            </div>

            <p className="mt-3 leading-relaxed text-ck-navy/75">{job.summary}</p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-bold tracking-wide text-ck-navy/75 uppercase">What you&apos;d do</p>
                <ul className="mt-1.5 space-y-1">
                  {job.responsibilities.map((r) => (
                    <li key={r} className="text-sm text-ck-navy/75">
                      • {r}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-bold tracking-wide text-ck-navy/75 uppercase">What we look for</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {job.requirements.map((r) => (
                    <Badge key={r} variant="secondary" className="rounded-full">
                      {r}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <FormDialog
        open={!!applyFor}
        onOpenChange={(o) => !o && setApplyFor(null)}
        title={applyFor ? `Apply — ${applyFor.title}` : ""}
        description="We read every application ourselves. Expect a reply within a week."
        submitLabel="Send application"
        onSubmit={() => {
          if (!form.name.trim() || !form.phone.trim()) {
            toast.error("Please add your name and phone number");
            return false;
          }
          toast.success("Application received — thank you!", {
            description: `We'll be in touch about the ${applyFor?.title} role.`,
          });
          setForm({ name: "", email: "", phone: "", experience: "", skills: [], note: "" });
          setApplyFor(null);
          return true;
        }}
        size="lg"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Your name" required value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <TextField label="Phone" required type="tel" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          <TextField label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          <SelectField
            label="Years of experience"
            value={form.experience}
            onChange={(v) => setForm({ ...form, experience: v })}
            options={["Fresher", "1–2 years", "3–5 years", "5+ years"].map((e) => ({ value: e, label: e }))}
            placeholder="Select"
          />
        </div>
        <ListField label="Skills / qualifications" values={form.skills} onChange={(v) => setForm({ ...form, skills: v })} placeholder="B.Ed, Montessori, Bengali" />
        <TextareaField
          label="Why do you want to work with young children?"
          rows={4}
          value={form.note}
          onChange={(v) => setForm({ ...form, note: v })}
        />
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Send className="h-3 w-3" /> Email your CV to hello@climbkiddo.in with this reference.
        </p>
      </FormDialog>
    </div>
  );
}
