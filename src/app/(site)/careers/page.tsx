import type { Metadata } from "next";
import { Heart, GraduationCap, Users } from "lucide-react";
import { PageHeader } from "@/components/sections/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { CareersBoard } from "@/frontend/components/features/marketing/CareersBoard";

export const metadata: Metadata = {
  title: "Careers · Teach at Climb Kiddo",
  description:
    "Open teaching, caregiving and admissions roles at Climb Kiddo Kolkata. Patience first, qualifications second — we train the rest.",
};

const PERKS = [
  {
    icon: <Heart className="h-5 w-5" />,
    title: "Small batches",
    body: "Never more than sixteen children to a room, always with an assistant. You get to actually know each child.",
  },
  {
    icon: <GraduationCap className="h-5 w-5" />,
    title: "Paid training",
    body: "Our 120-hour teachers-training programme, free for staff, plus one external workshop a year.",
  },
  {
    icon: <Users className="h-5 w-5" />,
    title: "A team that shows up",
    body: "Cover for each other's sick days, share lesson plans, and eat lunch together most days.",
  },
];

export default function CareersPage() {
  return (
    <>
      <PageHeader
        eyebrow="Careers"
        title="Come and teach with"
        highlight="us"
        description="Patience first. Qualifications second. We will happily train the rest."
      />

      <section className="mx-auto max-w-5xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          {PERKS.map((p) => (
            <Card key={p.title} className="rounded-3xl border-ck-cream">
              <CardContent className="p-6">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-ck-green/15 text-lime-700">
                  {p.icon}
                </span>
                <h3 className="mt-3 font-[family-name:var(--font-fredoka)] text-lg font-bold text-ck-navy">
                  {p.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ck-navy/70">{p.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <h2 className="mt-12 mb-4 font-[family-name:var(--font-fredoka)] text-2xl font-bold text-ck-navy">
          Open roles
        </h2>
        <CareersBoard />
      </section>
    </>
  );
}
