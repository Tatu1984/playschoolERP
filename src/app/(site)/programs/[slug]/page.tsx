import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Aurora } from "@/components/reactbits/Aurora";
import { GradientText } from "@/components/reactbits/GradientText";
import { CLASSROOMS, CURRICULUM, FEE_STRUCTURES, PROGRAMS, STAFF, STUDENTS } from "@/shared/fixtures";
import { formatMoney } from "@/shared/utils/common.util";
import { ACCENT_SOFT_BG, ACCENT_TEXT } from "@/frontend/utils/accents";
import { cn } from "@/lib/utils";

export function generateStaticParams() {
  return PROGRAMS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const program = PROGRAMS.find((p) => p.slug === slug);
  if (!program) return { title: "Program · Climb Kiddo" };
  return {
    title: `${program.name} (${program.ageFrom}–${program.ageTo} yrs) · Climb Kiddo`,
    description: `${program.tagline}. ${program.description}`,
    openGraph: {
      title: `${program.name} at Climb Kiddo`,
      description: program.tagline,
      type: "article",
    },
  };
}

export default async function ProgramDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const program = PROGRAMS.find((p) => p.slug === slug);
  if (!program) notFound();

  const rooms = CLASSROOMS.filter((c) => c.programSlug === program.slug);
  const units = CURRICULUM.filter((u) => u.programSlug === program.slug).sort((a, b) => a.term - b.term);
  const fees = FEE_STRUCTURES.find((f) => f.programSlug === program.slug);
  const teachers = STAFF.filter((s) => s.classroomIds.some((id) => rooms.some((r) => r.id === id)));
  const enrolled = STUDENTS.filter((s) => s.programSlug === program.slug && s.status === "ACTIVE").length;
  const seats = rooms.reduce((sum, r) => sum + r.capacity, 0);
  const others = PROGRAMS.filter((p) => p.slug !== program.slug).slice(0, 4);

  return (
    <>
      {/* hero */}
      <section className="relative isolate overflow-hidden pt-12 pb-14 sm:pt-16">
        <Aurora className="opacity-50" />
        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <Button asChild variant="ghost" size="sm" className="font-bold">
            <Link href="/programs">
              <ArrowLeft /> All programs
            </Link>
          </Button>

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <span className={cn("grid h-20 w-20 place-items-center rounded-3xl text-5xl", ACCENT_SOFT_BG[program.accent])} aria-hidden>
              {program.emoji}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="rounded-full font-bold">
                  {program.ageFrom}–{program.ageTo} yrs
                </Badge>
                <Badge variant="outline" className="rounded-full font-bold">
                  <Clock className="mr-1 h-3 w-3" /> {program.durationLabel}
                </Badge>
                <Badge variant="outline" className="rounded-full font-bold">
                  <Users className="mr-1 h-3 w-3" /> {program.seatsPerBatch} per batch
                </Badge>
              </div>
              <h1 className="mt-2 font-[family-name:var(--font-fredoka)] text-4xl font-bold text-ck-navy sm:text-5xl">
                {program.name}
              </h1>
              <p className={cn("mt-1 text-lg font-bold", ACCENT_TEXT[program.accent])}>{program.tagline}</p>
            </div>
          </div>

          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ck-navy/75">{program.description}</p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="lg" className="rounded-xl px-7 py-6 text-base font-bold">
              <Link href="/admissions/apply">
                Apply for this program <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-xl px-7 py-6 text-base font-bold">
              <Link href="/admissions/visit">Book a visit</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl space-y-14 px-4 pb-20 sm:px-6 lg:px-8">
        {/* at a glance */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Children enrolled", `${enrolled}`],
            ["Seats per batch", `${program.seatsPerBatch}`],
            ["Classrooms", `${rooms.length}`],
            ["Total capacity", `${seats || program.seatsPerBatch}`],
          ].map(([label, value]) => (
            <Card key={label} className="rounded-2xl border-ck-cream">
              <CardContent className="p-4 text-center">
                <p className="font-[family-name:var(--font-fredoka)] text-2xl font-bold text-ck-navy">{value}</p>
                <p className="mt-0.5 text-xs font-bold tracking-wide text-ck-navy/50 uppercase">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* outcomes + activities */}
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="flex items-center gap-2 font-[family-name:var(--font-fredoka)] text-2xl font-bold text-ck-navy">
              <Target className="h-5 w-5 text-ck-red" /> What your child will learn
            </h2>
            <ul className="mt-4 space-y-2.5">
              {program.outcomes.map((o) => (
                <li key={o} className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ck-green" />
                  <span className="text-ck-navy/80">{o}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="flex items-center gap-2 font-[family-name:var(--font-fredoka)] text-2xl font-bold text-ck-navy">
              <Sparkles className="h-5 w-5 text-ck-orange" /> A typical week
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {program.activities.map((a) => (
                <span
                  key={a}
                  className={cn("rounded-full px-3 py-1.5 text-sm font-bold text-ck-navy", ACCENT_SOFT_BG[program.accent])}
                >
                  {a}
                </span>
              ))}
            </div>
            <h3 className="mt-6 font-[family-name:var(--font-fredoka)] text-lg font-bold text-ck-navy">
              Milestones we celebrate
            </h3>
            <ul className="mt-2 space-y-1.5">
              {program.milestones.map((m) => (
                <li key={m} className="flex items-start gap-2 text-sm text-ck-navy/75">
                  <span aria-hidden>🎉</span> {m}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* curriculum timeline */}
        {units.length > 0 && (
          <div>
            <h2 className="flex items-center gap-2 font-[family-name:var(--font-fredoka)] text-2xl font-bold text-ck-navy">
              <CalendarDays className="h-5 w-5 text-ck-blue" /> The year, term by term
            </h2>
            <ol className="mt-5 space-y-4 border-l-2 border-ck-cream pl-6">
              {units.map((unit) => (
                <li key={unit.id} className="relative">
                  <span
                    className={cn(
                      "absolute top-1 -left-[1.95rem] grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold text-white",
                      program.accent === "red" ? "bg-ck-red" : "bg-ck-navy",
                    )}
                  >
                    {unit.term}
                  </span>
                  <Card className="rounded-2xl border-ck-cream">
                    <CardContent className="p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="font-[family-name:var(--font-fredoka)] text-lg font-bold text-ck-navy">
                          {unit.title}
                        </h3>
                        <Badge variant="outline" className="rounded-full">
                          {unit.weeks} weeks
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-ck-navy/70">{unit.focus}</p>
                      <ul className="mt-2 flex flex-wrap gap-1.5">
                        {unit.outcomes.map((o) => (
                          <li key={o} className="rounded-md bg-ck-cream/50 px-2 py-0.5 text-xs font-medium text-ck-navy/80">
                            {o}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* fees + classrooms */}
        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          {fees && (
            <Card className="rounded-3xl border-ck-cream">
              <CardContent className="p-6">
                <h2 className="font-[family-name:var(--font-fredoka)] text-xl font-bold text-ck-navy">Fees</h2>
                <p className="mt-1 text-sm text-ck-navy/60">Kathgola campus · {fees.termsPerYear} terms a year</p>
                <ul className="mt-4 space-y-1.5 text-sm">
                  {[
                    ["Admission fee (one-time)", fees.admissionFee],
                    ["Term fee", fees.termFee],
                    ["Meals", fees.mealFee],
                    ["Activity kit", fees.activityFee],
                    ["Transport (optional)", fees.transportFee],
                  ].map(([label, amount]) => (
                    <li key={label as string} className="flex justify-between border-b border-dashed border-ck-cream pb-1.5">
                      <span className="text-ck-navy/70">{label}</span>
                      <span className="font-bold tabular-nums text-ck-navy">{formatMoney(amount as number)}</span>
                    </li>
                  ))}
                  <li className="flex justify-between pt-1.5">
                    <span className="font-bold text-ck-navy">Payable per term</span>
                    <span className="font-[family-name:var(--font-fredoka)] text-lg font-bold text-ck-red">
                      {formatMoney(fees.termFee + fees.mealFee + fees.activityFee)}
                    </span>
                  </li>
                </ul>
                <p className="mt-3 text-xs text-ck-navy/50">
                  Sibling discount 10% on term fees. Late fee {formatMoney(fees.lateFeePerDay)}/day after the due date.
                </p>
                <Button asChild className="mt-4 w-full rounded-xl font-bold">
                  <Link href="/admissions/seats">Check seat availability</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="space-y-4">
            {rooms.length > 0 && (
              <Card className="rounded-3xl border-ck-cream">
                <CardContent className="p-6">
                  <h2 className="font-[family-name:var(--font-fredoka)] text-xl font-bold text-ck-navy">
                    Where it happens
                  </h2>
                  <ul className="mt-3 space-y-2">
                    {rooms.map((room) => (
                      <li key={room.id} className="rounded-xl bg-ck-cream/30 p-3">
                        <p className="font-bold text-ck-navy">{room.name}</p>
                        <p className="text-xs text-ck-navy/60">
                          {room.room} · up to {room.capacity} children
                        </p>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {teachers.length > 0 && (
              <Card className="rounded-3xl border-ck-cream">
                <CardContent className="p-6">
                  <h2 className="font-[family-name:var(--font-fredoka)] text-xl font-bold text-ck-navy">
                    Who teaches it
                  </h2>
                  <ul className="mt-3 space-y-2.5">
                    {teachers.map((t) => (
                      <li key={t.id} className="flex items-center gap-3">
                        <span className="grid h-10 w-10 place-items-center rounded-full bg-ck-sky text-lg" aria-hidden>
                          {t.photoEmoji}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-bold text-ck-navy">{t.name}</span>
                          <span className="block truncate text-xs text-ck-navy/60">
                            {t.designation} · {t.qualification}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* other programs */}
        <div>
          <h2 className="font-[family-name:var(--font-fredoka)] text-2xl font-bold text-ck-navy">
            Other <GradientText>programs</GradientText>
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {others.map((p) => (
              <Link
                key={p.slug}
                href={`/programs/${p.slug}`}
                className={cn(
                  "flex flex-col gap-1 rounded-2xl p-4 transition hover:scale-[1.02]",
                  ACCENT_SOFT_BG[p.accent],
                )}
              >
                <span className="text-3xl" aria-hidden>
                  {p.emoji}
                </span>
                <span className="font-[family-name:var(--font-fredoka)] font-bold text-ck-navy">{p.name}</span>
                <span className="text-xs text-ck-navy/60">
                  {p.ageFrom}–{p.ageTo} yrs
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="rounded-[2rem] bg-ck-navy p-8 text-center text-white">
          <h2 className="font-[family-name:var(--font-fredoka)] text-2xl font-bold sm:text-3xl">
            Is {program.name} right for your child?
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-white/80">
            Tell us their birthday and we&apos;ll say exactly which batch they&apos;d join, who their teacher would be,
            and when a seat opens.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button asChild className="rounded-xl bg-white font-bold text-ck-navy hover:bg-white/90">
              <Link href="/admissions#enquire">Ask us</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-xl border-white/40 font-bold text-white hover:bg-white/10">
              <Link href="/campus-tour">See the classrooms</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
