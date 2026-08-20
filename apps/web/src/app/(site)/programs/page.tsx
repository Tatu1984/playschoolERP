import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock, Users } from "lucide-react";
import { PageHeader } from "@/components/sections/PageHeader";
import { Programs } from "@/components/sections/Programs";
import { Contact } from "@/components/sections/Contact";
import { Badge } from "@/components/ui/badge";
import { GradientText } from "@/components/reactbits/GradientText";
import { publicService } from "@/backend/services/public.service";
import { formatMoney } from "@/shared/utils/common.util";
import { ACCENT_SOFT_BG, ACCENT_TEXT } from "@/frontend/utils/accents";
import { cn } from "@/lib/utils";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "Programs · Climb Kiddo",
  description:
    "Age-perfect programs from Toddlers to Senior KG, plus abacus, activity club, summer camps and weekend workshops.",
};

export default async function ProgramsPage() {
  const PROGRAMS = await publicService.programs();
  return (
    <>
      <PageHeader
        eyebrow="Programs"
        title="A program for"
        highlight="every little age"
        description="Carefully crafted milestones from 1.5 to 5.5 years — plus summer camps and weekend workshops kids beg to come back to."
      />
      <Programs showHeading={false} />

      {/* Every program, each linking to its own page */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <h2 className="text-center font-[family-name:var(--font-fredoka)] text-3xl font-bold text-ck-navy">
          Explore each <GradientText>program</GradientText>
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-ck-navy/70">
          Outcomes, the term-by-term curriculum, fees, classrooms and who teaches it.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PROGRAMS.map((program) => (
            <Link
              key={program.slug}
              href={`/programs/${program.slug}`}
              className={cn(
                "group flex flex-col gap-3 rounded-3xl p-6 transition hover:scale-[1.02]",
                ACCENT_SOFT_BG[program.accent],
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="text-5xl" aria-hidden>
                  {program.emoji}
                </span>
                <Badge variant="secondary" className="rounded-full bg-white/70 font-bold">
                  {program.ageFrom}–{program.ageTo} yrs
                </Badge>
              </div>

              <div>
                <h3 className="font-[family-name:var(--font-fredoka)] text-xl font-bold text-ck-navy">
                  {program.name}
                </h3>
                <p className={cn("text-sm font-bold", ACCENT_TEXT[program.accent])}>{program.tagline}</p>
              </div>

              <p className="line-clamp-2 text-sm text-ck-navy/70">{program.description}</p>

              <div className="mt-auto flex flex-wrap items-center gap-3 text-xs font-bold text-ck-navy/60">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> {program.durationLabel}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" /> {program.seatsPerBatch} per batch
                </span>
                <span>{formatMoney(program.feePerTerm)}/term</span>
              </div>

              <span className="flex items-center gap-1 text-sm font-bold text-ck-red">
                See the full program
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <Contact />
    </>
  );
}
