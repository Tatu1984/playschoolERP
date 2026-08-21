"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, CheckCircle2, FileUp, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { post } from "@/frontend/api/client";
import { usePublicSite } from "@/frontend/hooks/usePublicSite";
import { Stepper } from "@/frontend/components/ui/Bits";
import { SelectField, TextField, TextareaField } from "@/frontend/components/ui/Field";
import type { ProgramSlug } from "@/shared/types/school.types";
import type { Application } from "@/shared/types/engagement.types";
import { formatMoney } from "@/shared/utils/common.util";
import { cn } from "@/lib/utils";

const STEPS = ["Child", "Parent", "Documents", "Review"];

const DOCS = ["Birth certificate", "Aadhaar copy", "Vaccination record", "Passport photo", "Address proof"];

/** Four-step online application (SoW §7.5 `POST /api/admissions/applications`). */
export function ApplicationWizard() {
  const { branches, programs, feeStructures } = usePublicSite();

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<string[]>([]);
  const [form, setForm] = useState({
    childName: "",
    childDob: "",
    gender: "M",
    programSlug: "nursery" as ProgramSlug,
    branchId: "",
    parentName: "",
    relation: "MOTHER",
    phone: "",
    email: "",
    address: "",
    notes: "",
  });

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  // Until the campuses arrive, and until the applicant picks one, the first
  // campus stands in — the fee summary on the review step needs a real branch
  // to price against, and a seeded id hardcoded here would not be one.
  const branchId = form.branchId || branches[0]?.id || "";

  const program = programs.find((p) => p.slug === form.programSlug);
  const structure = feeStructures.find((f) => f.programSlug === form.programSlug && f.branchId === branchId);

  function validate(current: number): boolean {
    if (current === 0 && (!form.childName.trim() || !form.childDob)) {
      toast.error("Please add your child's name and date of birth");
      return false;
    }
    if (current === 1 && (!form.parentName.trim() || !form.phone.trim())) {
      toast.error("Please add a parent name and phone number");
      return false;
    }
    return true;
  }

  async function submit() {
    setBusy(true);
    try {
      // The application number is the school's to issue, not the browser's —
      // it goes on paperwork and has to be unique across every applicant.
      const { application } = await post<{ application: Application }>("/admissions/applications", {
        inquiryId: null,
        childName: form.childName.trim(),
        childDob: new Date(form.childDob).toISOString(),
        programSlug: form.programSlug,
        branchId,
        parentName: form.parentName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        documents: DOCS.map((label, i) => ({
          id: `doc_${i}`,
          label,
          uploaded: uploaded.includes(label),
          ...(uploaded.includes(label)
            ? { fileName: `${label.toLowerCase().replace(/ /g, "-")}.pdf` }
            : {}),
        })),
      });
      setDone(application.applicationNo);
      toast.success("Application submitted!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "We could not submit that — please try again");
      return;
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border bg-card p-8 text-center">
        <PartyPopper className="mx-auto h-14 w-14 text-ck-orange" />
        <h2 className="mt-3 font-[family-name:var(--font-fredoka)] text-2xl font-bold text-ck-navy">
          Application submitted
        </h2>
        <p className="mt-2 text-sm text-ck-navy/70">
          Your reference is <strong>{done}</strong>. We&apos;ll review it within three working days and call{" "}
          {form.phone} to arrange a visit.
        </p>
        <div className="mt-4 rounded-2xl bg-muted/60 p-3 text-left text-sm">
          <p className="font-bold">What happens next</p>
          <ol className="mt-1 space-y-1 text-ck-navy/70">
            <li>1. Document check by the office</li>
            <li>2. A short visit with your child</li>
            <li>3. Seat offer and admission fee</li>
            <li>4. First day, and lots of photos</li>
          </ol>
        </div>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button asChild className="rounded-xl font-bold">
            <Link href="/admissions/visit">Book a campus visit</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-xl font-bold">
            <Link href="/">Back to the website</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Stepper steps={STEPS} current={step} className="justify-center" />

      <div className="rounded-3xl border bg-card p-5 sm:p-6">
        {step === 0 && (
          <div className="space-y-3">
            <h2 className="font-[family-name:var(--font-fredoka)] text-xl font-bold text-ck-navy">
              About your child
            </h2>
            <TextField label="Child's full name" required value={form.childName} onChange={(v) => set("childName", v)} />
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField label="Date of birth" required type="date" value={form.childDob} onChange={(v) => set("childDob", v)} />
              <SelectField
                label="Gender"
                value={form.gender}
                onChange={(v) => set("gender", v)}
                options={[
                  { value: "M", label: "Boy" },
                  { value: "F", label: "Girl" },
                  { value: "OTHER", label: "Other" },
                ]}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <SelectField
                label="Program"
                value={form.programSlug}
                onChange={(v) => set("programSlug", v as ProgramSlug)}
                options={programs.map((p) => ({ value: p.slug, label: `${p.emoji} ${p.name} (${p.ageFrom}–${p.ageTo} yrs)` }))}
              />
              <SelectField
                label="Branch"
                value={branchId}
                onChange={(v) => set("branchId", v)}
                options={branches.map((b) => ({ value: b.id, label: b.name.replace("Climb Kiddo — ", "") }))}
              />
            </div>
            {program && (
              <div className="rounded-2xl bg-ck-sky p-3 text-sm">
                <p className="font-bold text-ck-navy">{program.name}</p>
                <p className="text-ck-navy/70">{program.tagline} · {program.durationLabel}</p>
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <h2 className="font-[family-name:var(--font-fredoka)] text-xl font-bold text-ck-navy">Parent details</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField label="Parent's name" required value={form.parentName} onChange={(v) => set("parentName", v)} />
              <SelectField
                label="Relation"
                value={form.relation}
                onChange={(v) => set("relation", v)}
                options={["MOTHER", "FATHER", "GRANDPARENT", "OTHER"].map((r) => ({
                  value: r,
                  label: r.charAt(0) + r.slice(1).toLowerCase(),
                }))}
              />
              <TextField label="Phone" required type="tel" value={form.phone} onChange={(v) => set("phone", v)} />
              <TextField label="Email" type="email" value={form.email} onChange={(v) => set("email", v)} />
            </div>
            <TextareaField label="Home address" rows={2} value={form.address} onChange={(v) => set("address", v)} />
            <TextareaField
              label="Anything we should know?"
              rows={2}
              value={form.notes}
              onChange={(v) => set("notes", v)}
              placeholder="Allergies, previous school, siblings with us…"
            />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <h2 className="font-[family-name:var(--font-fredoka)] text-xl font-bold text-ck-navy">Documents</h2>
            <p className="text-sm text-ck-navy/70">
              Tick what you can attach now — you can also bring originals to the visit.
            </p>
            <ul className="space-y-2">
              {DOCS.map((doc) => {
                const on = uploaded.includes(doc);
                return (
                  <li key={doc}>
                    <button
                      type="button"
                      onClick={() => setUploaded((u) => (on ? u.filter((d) => d !== doc) : [...u, doc]))}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-xl border p-3 text-left text-sm transition",
                        on ? "border-ck-green bg-ck-green/10" : "hover:bg-muted",
                      )}
                    >
                      <span className="flex items-center gap-2">
                        {on ? <CheckCircle2 className="h-4 w-4 text-ck-green" /> : <FileUp className="h-4 w-4 text-muted-foreground" />}
                        {doc}
                      </span>
                      <Badge variant={on ? "secondary" : "outline"}>{on ? "attached" : "attach"}</Badge>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <h2 className="font-[family-name:var(--font-fredoka)] text-xl font-bold text-ck-navy">Review</h2>
            <dl className="divide-y text-sm">
              {[
                ["Child", form.childName || "—"],
                ["Date of birth", form.childDob || "—"],
                ["Program", program?.name ?? "—"],
                ["Branch", branches.find((b) => b.id === branchId)?.name ?? "—"],
                ["Parent", `${form.parentName || "—"} (${form.relation.toLowerCase()})`],
                ["Phone", form.phone || "—"],
                ["Email", form.email || "—"],
                ["Documents attached", `${uploaded.length} of ${DOCS.length}`],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3 py-2">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="text-right font-medium">{value}</dd>
                </div>
              ))}
            </dl>
            {structure && (
              <div className="rounded-2xl bg-ck-cream/50 p-3 text-sm">
                <p className="font-bold text-ck-navy">Fees for this program</p>
                <p className="text-ck-navy/70">
                  Admission {formatMoney(structure.admissionFee)} (one-time) ·{" "}
                  {formatMoney(structure.termFee + structure.mealFee + structure.activityFee)} per term ·{" "}
                  {structure.termsPerYear} terms a year
                </p>
              </div>
            )}
            <p className="text-xs text-ck-navy/60">
              Submitting does not guarantee a seat. Seats are confirmed after a visit and the admission fee.
            </p>
          </div>
        )}

        <div className="mt-5 flex justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl font-bold"
            disabled={step === 0}
            onClick={() => setStep((s) => s - 1)}
          >
            <ArrowLeft /> Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button
              type="button"
              className="rounded-xl font-bold"
              onClick={() => {
                if (validate(step)) setStep((s) => s + 1);
              }}
            >
              Continue <ArrowRight />
            </Button>
          ) : (
            <Button disabled={busy} type="button" className="rounded-xl font-bold" onClick={submit}>
              Submit application
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
