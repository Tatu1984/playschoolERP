import type { Metadata } from "next";
import { PageHeader } from "@/components/sections/PageHeader";
import { Contact } from "@/components/sections/Contact";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AnimatedList, AnimatedItem } from "@/components/reactbits/AnimatedList";
import { TiltedCard } from "@/components/reactbits/TiltedCard";
import { GradientText } from "@/components/reactbits/GradientText";
import { Counter } from "@/components/reactbits/Counter";
import {
  GraduationCap,
  BookOpen,
  Users,
  Heart,
  Lightbulb,
  ClipboardCheck,
  Award,
  CalendarDays,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Primary Teachers Training · Climb Kiddo",
  description:
    "A certified Primary Teachers Training program at Climb Kiddo — child psychology, lesson design, classroom craft and hands-on practicum.",
};

const MODULES = [
  {
    icon: Heart,
    color: "#DC2638",
    title: "Child Psychology",
    body: "Understand how 2–8 year-olds think, feel and learn — the science behind every lesson.",
  },
  {
    icon: BookOpen,
    color: "#F39A1E",
    title: "Curriculum & Lesson Design",
    body: "Build age-perfect lesson plans, worksheets and play-based activities.",
  },
  {
    icon: Users,
    color: "#2BAEEC",
    title: "Classroom Management",
    body: "Routines, discipline, group dynamics and parent communication — the daily craft.",
  },
  {
    icon: Lightbulb,
    color: "#D4318F",
    title: "Phonics & Early Literacy",
    body: "Teach reading, writing and pronunciation the modern, joyful way.",
  },
  {
    icon: ClipboardCheck,
    color: "#8BC53F",
    title: "Early Math Methods",
    body: "Concrete-pictorial-abstract methods, manipulatives and number sense.",
  },
  {
    icon: GraduationCap,
    color: "#1A1F4B",
    title: "Practicum & Mentoring",
    body: "Supervised classroom hours at Climb Kiddo with one-on-one mentor feedback.",
  },
];

const FOR_WHOM = [
  "Aspiring nursery & primary teachers",
  "Stay-at-home parents returning to work",
  "Graduates exploring an education career",
  "Existing teachers seeking certification",
];

const STATS = [
  { value: 6, suffix: " modules", label: "Hands-on curriculum", color: "#DC2638" },
  { value: 120, suffix: " hrs", label: "Of training + practicum", color: "#F39A1E" },
  { value: 1, suffix: ":6", label: "Mentor ratio", color: "#2BAEEC" },
  { value: 100, suffix: "%", label: "Placement support", color: "#8BC53F" },
];

export default function TeachersTrainingPage() {
  return (
    <>
      <PageHeader
        eyebrow="Primary Teachers Training"
        title="Train to teach the"
        highlight="earliest minds."
        description="A practitioner-led certification program in early childhood education — built around real classrooms, real children, real outcomes."
      />

      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <AnimatedList
            className="grid grid-cols-2 gap-4 sm:grid-cols-4"
            stagger={0.1}
          >
            {STATS.map((s) => (
              <AnimatedItem key={s.label}>
                <div className="rounded-3xl bg-white p-6 text-center shadow-[0_8px_30px_rgba(26,31,75,0.06)] ring-1 ring-ck-navy/5">
                  <div
                    className="font-[family-name:var(--font-fredoka)] text-3xl sm:text-4xl font-bold"
                    style={{ color: s.color }}
                  >
                    <Counter to={s.value} suffix={s.suffix} />
                  </div>
                  <p className="mt-2 text-sm font-semibold text-ck-navy/70">
                    {s.label}
                  </p>
                </div>
              </AnimatedItem>
            ))}
          </AnimatedList>
        </div>
      </section>

      <section className="py-12 sm:py-16 bg-white/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <Badge variant="secondary" className="rounded-full bg-ck-cream text-ck-navy font-bold px-4">
              Six core modules
            </Badge>
            <h2 className="mt-4 font-[family-name:var(--font-fredoka)] text-3xl sm:text-4xl font-bold text-ck-navy">
              Everything a great early-years teacher{" "}
              <GradientText>actually needs</GradientText>
            </h2>
            <p className="mt-4 text-ck-navy/70">
              No fluff. Each module pairs theory with classroom practice — and
              ends with a tangible deliverable you can use on day one.
            </p>
          </div>

          <AnimatedList
            className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3"
            stagger={0.08}
          >
            {MODULES.map((m) => {
              const Icon = m.icon;
              return (
                <AnimatedItem key={m.title}>
                  <TiltedCard className="h-full">
                    <Card className="h-full rounded-3xl border-0 bg-white shadow-[0_8px_24px_rgba(26,31,75,0.06)]">
                      <CardContent className="p-6">
                        <span
                          className="inline-flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-md"
                          style={{ backgroundColor: m.color }}
                        >
                          <Icon className="h-6 w-6" />
                        </span>
                        <h3 className="mt-5 font-[family-name:var(--font-fredoka)] text-lg font-bold text-ck-navy">
                          {m.title}
                        </h3>
                        <p className="mt-2 text-sm text-ck-navy/70 leading-relaxed">
                          {m.body}
                        </p>
                      </CardContent>
                    </Card>
                  </TiltedCard>
                </AnimatedItem>
              );
            })}
          </AnimatedList>
        </div>
      </section>

      <section className="py-12 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <Badge variant="secondary" className="rounded-full bg-ck-cream text-ck-navy font-bold px-4">
                Who it&apos;s for
              </Badge>
              <h2 className="mt-4 font-[family-name:var(--font-fredoka)] text-3xl sm:text-4xl font-bold text-ck-navy">
                For anyone who loves{" "}
                <GradientText>little learners</GradientText>
              </h2>
              <ul className="mt-6 space-y-3">
                {FOR_WHOM.map((p) => (
                  <li key={p} className="flex items-start gap-3 text-ck-navy/85">
                    <span className="mt-1.5 inline-block h-2 w-2 rounded-full bg-ck-red" />
                    <span className="font-semibold">{p}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Card className="rounded-3xl border-0 bg-gradient-to-br from-ck-cream via-white to-ck-peach shadow-[0_20px_50px_rgba(26,31,75,0.08)]">
              <CardContent className="p-8 sm:p-10 space-y-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ck-red text-white shadow-md">
                    <Award className="h-6 w-6" />
                  </span>
                  <div>
                    <p className="font-[family-name:var(--font-fredoka)] text-xl font-bold text-ck-navy">
                      Certification
                    </p>
                    <p className="text-sm text-ck-navy/70">
                      Climb Kiddo Primary Teaching Certificate awarded on
                      completion.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ck-orange text-white shadow-md">
                    <CalendarDays className="h-6 w-6" />
                  </span>
                  <div>
                    <p className="font-[family-name:var(--font-fredoka)] text-xl font-bold text-ck-navy">
                      Flexible batches
                    </p>
                    <p className="text-sm text-ck-navy/70">
                      Weekday & weekend cohorts. Practicum scheduled around
                      you.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ck-blue text-white shadow-md">
                    <GraduationCap className="h-6 w-6" />
                  </span>
                  <div>
                    <p className="font-[family-name:var(--font-fredoka)] text-xl font-bold text-ck-navy">
                      Placement support
                    </p>
                    <p className="text-sm text-ck-navy/70">
                      Hiring partners include Climb Kiddo&apos;s own classrooms.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <Contact />
    </>
  );
}
