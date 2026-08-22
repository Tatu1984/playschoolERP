import type { Metadata } from "next";
import { PageHeader } from "@/components/sections/PageHeader";

export const metadata: Metadata = {
  title: "Terms of Use · Climb Kiddo",
  description: "Terms covering enrolment, fees, attendance, pickup, media consent and use of the Climb Kiddo parent portal.",
};

const TERMS: { heading: string; body: string[] }[] = [
  {
    heading: "Enrolment",
    body: [
      "A seat is confirmed only when the admission fee is received and a start date is agreed in writing.",
      "The admission fee is one-time and non-refundable. Term fees are refundable pro-rata for the unused portion of a term if you give 30 days' notice.",
    ],
  },
  {
    heading: "Fees",
    body: [
      "Term fees are due by the 10th of the term's first month. A late fee applies daily after that, as published in the fee structure.",
      "Sibling discount is 10% on term fees for the younger child, applied automatically.",
    ],
  },
  {
    heading: "Attendance and pickup",
    body: [
      "Children are released only to a guardian on file or a person carrying a valid one-time pickup code.",
      "Please inform the class teacher before 9 AM if your child will be absent.",
      "Late pickup beyond 30 minutes past your batch's end time is charged at the published hourly rate.",
    ],
  },
  {
    heading: "Health",
    body: [
      "Keep your child at home with a fever, conjunctivitis, or any contagious condition until 24 hours symptom-free.",
      "The campus is nut-free. Please do not send anything containing nuts, including spreads.",
      "Medication is administered only with written parental instruction on file.",
    ],
  },
  {
    heading: "Parent portal and app",
    body: [
      "Your login is personal. Do not share it — camera access and your child's records sit behind it.",
      "Live camera viewing is for your own child's classroom during school hours. Recording, screenshotting or re-sharing any stream is prohibited and is grounds for revoking access.",
      "Content in the class feed is for the parents of tagged children only. Please do not repost it publicly.",
    ],
  },
  {
    heading: "Behaviour",
    body: [
      "We do not use physical discipline, shaming, or withdrawal of food as consequences, ever.",
      "Persistent behaviour that endangers other children is handled through a written plan agreed with you, not by exclusion.",
    ],
  },
];

export default function TermsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Terms"
        title="The rules, kept"
        highlight="short"
        description="Enrolment, fees, pickup, health and how to use the parent portal responsibly."
      />
      <section className="mx-auto max-w-3xl space-y-8 px-4 pb-20 sm:px-6 lg:px-8">
        {TERMS.map((s) => (
          <div key={s.heading}>
            <h2 className="font-[family-name:var(--font-fredoka)] text-xl font-bold text-ck-navy">{s.heading}</h2>
            <ul className="mt-2 space-y-2">
              {s.body.map((line) => (
                <li key={line} className="text-sm leading-relaxed text-ck-navy/75">
                  • {line}
                </li>
              ))}
            </ul>
          </div>
        ))}
        <p className="border-t border-ck-cream pt-6 text-xs text-ck-navy/75">
          Last updated July 2026. These terms sit alongside your signed enrolment form.
        </p>
      </section>
    </>
  );
}
