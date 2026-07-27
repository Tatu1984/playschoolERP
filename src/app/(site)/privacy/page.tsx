import type { Metadata } from "next";
import { PageHeader } from "@/components/sections/PageHeader";

export const metadata: Metadata = {
  title: "Privacy Policy · Climb Kiddo",
  description: "How Climb Kiddo collects, uses and protects your family's data, including children's photos and live camera access.",
};

const SECTIONS: { heading: string; body: string[] }[] = [
  {
    heading: "What we collect",
    body: [
      "Parent details: name, phone, email, address and relationship to the child.",
      "Child details: name, date of birth, photographs, medical and allergy information, attendance, and progress notes written by teachers.",
      "Usage data: which pages of the parent portal you open, and when a live camera stream is requested. We log this for child-safety accountability.",
    ],
  },
  {
    heading: "Live classroom cameras",
    body: [
      "Live viewing is restricted to the classroom your own child is enrolled in, during that branch's school hours only.",
      "Nothing is recorded. There is no archive to request, download or leak.",
      "Every authorisation decision and every stream start is written to an audit log with the user, camera and timestamp. Administrators review it.",
      "Camera credentials never reach a browser. Streams are proxied by a media server that validates a short-lived, single-camera token.",
    ],
  },
  {
    heading: "Children's photographs",
    body: [
      "Class-feed photos are visible only to parents of children tagged in that post.",
      "Website, brochure and social-media use requires separate written consent, which you can withdraw at any time from Settings → Privacy.",
      "We never sell photographs and never allow third-party advertising trackers in the Kids Zone.",
    ],
  },
  {
    heading: "Payments",
    body: [
      "Card and UPI details are handled entirely by our payment gateway (Razorpay). Climb Kiddo never sees or stores them.",
      "We keep the invoice, the amount, the method and the gateway reference for accounting and audit purposes.",
    ],
  },
  {
    heading: "Your rights",
    body: [
      "You can request a copy of everything we hold about your family, ask us to correct it, or ask us to delete it after your child leaves.",
      "Write to hello@climbkiddo.in or use Settings → Privacy in the parent portal. We respond within 30 days.",
    ],
  },
  {
    heading: "Retention",
    body: [
      "Attendance, fee and progress records are kept for seven years as required for school records.",
      "Photographs are deleted two years after a child leaves, unless you ask us to remove them sooner.",
      "Camera audit logs are kept for 12 months.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <>
      <PageHeader
        eyebrow="Privacy"
        title="Your family's data, in"
        highlight="plain language"
        description="No dark patterns, no data sales, and a camera system designed so that nothing is ever recorded."
      />
      <section className="mx-auto max-w-3xl space-y-8 px-4 pb-20 sm:px-6 lg:px-8">
        {SECTIONS.map((s) => (
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
        <p className="border-t border-ck-cream pt-6 text-xs text-ck-navy/50">
          Last updated July 2026. Questions about this policy go to hello@climbkiddo.in.
        </p>
      </section>
    </>
  );
}
