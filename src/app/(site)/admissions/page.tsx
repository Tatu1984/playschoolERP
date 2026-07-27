import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarCheck, CheckCircle2, FileText, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/sections/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EnquiryForm } from "@/frontend/components/features/marketing/EnquiryForm";
import { BRANCHES, FEE_STRUCTURES, PROGRAMS, STUDENTS } from "@/shared/fixtures";
import { formatMoney } from "@/shared/utils/common.util";

export const metadata: Metadata = {
  title: "Admissions 2026-27 · Climb Kiddo",
  description:
    "Apply online, book a campus visit and check seat availability for Climb Kiddo Kathgola and Dhakuria. Small batches, trained teachers, live classroom cameras.",
};

const STEPS = [
  {
    icon: <FileText className="h-5 w-5" />,
    title: "1 · Enquire",
    body: "Fill the form or call us. We'll answer every question you have, including the awkward ones about fees.",
  },
  {
    icon: <CalendarCheck className="h-5 w-5" />,
    title: "2 · Visit",
    body: "Come see a normal school day — not a staged tour. Bring your child; watching them play tells you more than we can.",
  },
  {
    icon: <CheckCircle2 className="h-5 w-5" />,
    title: "3 · Enrol",
    body: "Submit the form and documents, pay the admission fee, and pick a start date. We take about four weeks end to end.",
  },
];

export default function AdmissionsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Admissions"
        title="Admissions are open for"
        highlight="2026-27"
        description="Small batches fill quickly — Toddlers and Nursery usually close by August. Three simple steps, no donations, no hidden charges."
      />

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        {/* steps */}
        <div className="grid gap-4 md:grid-cols-3">
          {STEPS.map((s) => (
            <Card key={s.title} className="rounded-3xl border-ck-cream">
              <CardContent className="p-6">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-ck-red/10 text-ck-red">{s.icon}</span>
                <h3 className="mt-3 font-[family-name:var(--font-fredoka)] text-lg font-bold text-ck-navy">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ck-navy/70">{s.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" className="rounded-xl px-7 py-6 text-base font-bold">
            <Link href="/admissions/apply">
              Start an application <ArrowRight />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="rounded-xl px-7 py-6 text-base font-bold">
            <Link href="/admissions/visit">Book a campus visit</Link>
          </Button>
          <Button asChild size="lg" variant="ghost" className="rounded-xl px-7 py-6 text-base font-bold">
            <Link href="/admissions/seats">Check seat availability</Link>
          </Button>
        </div>

        {/* fees */}
        <div className="mt-16 grid gap-8 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <Badge variant="secondary" className="rounded-full px-4 font-bold">
              <Sparkles className="mr-1 h-3 w-3" /> Fee structure
            </Badge>
            <h2 className="mt-3 font-[family-name:var(--font-fredoka)] text-3xl font-bold text-ck-navy">
              Everything, in one table
            </h2>
            <p className="mt-2 text-ck-navy/70">
              Per-term fees for the Kathgola campus. Dhakuria runs a little lower — ask us for the exact sheet.
            </p>

            <div className="mt-5 overflow-x-auto rounded-3xl border border-ck-cream">
              <table className="w-full text-sm">
                <thead className="bg-ck-cream/40 text-left text-xs font-bold tracking-wide text-ck-navy/60 uppercase">
                  <tr>
                    <th className="px-4 py-3">Program</th>
                    <th className="px-4 py-3">Ages</th>
                    <th className="px-4 py-3">Admission</th>
                    <th className="px-4 py-3">Per term</th>
                    <th className="px-4 py-3">Seats / batch</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ck-cream">
                  {PROGRAMS.filter((p) => !["abacus", "activity-club"].includes(p.slug)).map((p) => {
                    const fs = FEE_STRUCTURES.find((f) => f.programSlug === p.slug && f.branchId === "br_kathgola");
                    return (
                      <tr key={p.slug} className="hover:bg-ck-cream/20">
                        <td className="px-4 py-3 font-bold text-ck-navy">
                          {p.emoji} {p.name}
                        </td>
                        <td className="px-4 py-3 text-ck-navy/70">
                          {p.ageFrom}–{p.ageTo} yrs
                        </td>
                        <td className="px-4 py-3 text-ck-navy/70">
                          {fs ? formatMoney(fs.admissionFee) : "—"}
                        </td>
                        <td className="px-4 py-3 font-bold text-ck-navy">
                          {fs ? formatMoney(fs.termFee + fs.mealFee + fs.activityFee) : formatMoney(p.feePerTerm)}
                        </td>
                        <td className="px-4 py-3 text-ck-navy/70">{p.seatsPerBatch}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-ck-navy/50">
              Three terms a year. Transport is optional and billed separately. Sibling discount of 10% on term fees.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {BRANCHES.map((b) => (
                <Card key={b.id} className="rounded-3xl border-ck-cream">
                  <CardContent className="p-5">
                    <h3 className="font-[family-name:var(--font-fredoka)] text-lg font-bold text-ck-navy">
                      {b.name.replace("Climb Kiddo — ", "")}
                    </h3>
                    <p className="mt-1 text-sm text-ck-navy/70">
                      {b.address}, {b.city} {b.pincode}
                    </p>
                    <p className="mt-2 text-sm text-ck-navy/70">
                      Open {b.opensAt}–{b.closesAt} · {b.phone}
                    </p>
                    <p className="mt-2 text-xs font-bold text-ck-navy/50">
                      {STUDENTS.filter((s) => s.branchId === b.id).length} children currently enrolled · capacity{" "}
                      {b.capacity}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div id="enquire">
            <EnquiryForm heading="Ask us anything" blurb="We reply within the hour, 9 am – 8 pm." />
          </div>
        </div>
      </section>
    </>
  );
}
