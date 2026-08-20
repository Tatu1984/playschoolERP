import type { Metadata } from "next";
import { PageHeader } from "@/components/sections/PageHeader";
import { Contact } from "@/components/sections/Contact";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AnimatedList, AnimatedItem } from "@/components/reactbits/AnimatedList";
import { TiltedCard } from "@/components/reactbits/TiltedCard";
import { GradientText } from "@/components/reactbits/GradientText";
import { Counter } from "@/components/reactbits/Counter";
import { Brain, Zap, Eye, Sparkles, Trophy } from "lucide-react";

export const metadata: Metadata = {
  title: "Abacus for Kids · Climb Kiddo",
  description:
    "Sharper minds, faster math. Climb Kiddo's Abacus program for kids — eight progressive levels, certified instructors, and joyful learning.",
};

const BENEFITS = [
  {
    icon: Brain,
    color: "#DC2638",
    title: "Whole-brain workout",
    body: "Abacus activates both hemispheres — building memory, focus and creativity together.",
  },
  {
    icon: Zap,
    color: "#F39A1E",
    title: "Lightning-fast math",
    body: "Children calculate four-digit problems in seconds — without a calculator.",
  },
  {
    icon: Eye,
    color: "#2BAEEC",
    title: "Sharper concentration",
    body: "Daily practice trains visualisation and attention spans that carry into school.",
  },
  {
    icon: Sparkles,
    color: "#D4318F",
    title: "Confidence on stage",
    body: "Level competitions and recitals build presence, courage and pride.",
  },
];

const LEVELS = [
  { level: "Level 1", focus: "Bead basics · single-digit", weeks: "8 wks" },
  { level: "Level 2", focus: "Two-digit addition & subtraction", weeks: "10 wks" },
  { level: "Level 3", focus: "Three-digit operations", weeks: "10 wks" },
  { level: "Level 4", focus: "Visualisation introduction", weeks: "12 wks" },
  { level: "Level 5", focus: "Four-digit & multiplication", weeks: "12 wks" },
  { level: "Level 6", focus: "Division & decimals", weeks: "12 wks" },
  { level: "Level 7", focus: "Mental abacus — speed", weeks: "14 wks" },
  { level: "Level 8", focus: "Grand mental abacus", weeks: "14 wks" },
];

const STATS = [
  { value: 8, suffix: "", label: "Progressive levels", color: "#DC2638" },
  { value: 5, suffix: "+", label: "Years old & up", color: "#F39A1E" },
  { value: 2, suffix: "x/wk", label: "Class frequency", color: "#2BAEEC" },
  { value: 100, suffix: "%", label: "Hands-on practice", color: "#8BC53F" },
];

export default function AbacusPage() {
  return (
    <>
      <PageHeader
        eyebrow="Abacus for Kids"
        title="Sharper minds, faster math —"
        highlight="bead by bead."
        description="An eight-level abacus journey designed for 5+ year-olds — building speed, memory and confidence through daily play."
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
                    className="font-[family-name:var(--font-fredoka)] text-4xl sm:text-5xl font-bold"
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
              Why abacus?
            </Badge>
            <h2 className="mt-4 font-[family-name:var(--font-fredoka)] text-3xl sm:text-4xl font-bold text-ck-navy">
              Four lifelong gifts in{" "}
              <GradientText>one little box of beads</GradientText>
            </h2>
            <p className="mt-4 text-ck-navy/70">
              The abacus isn&apos;t just about arithmetic — it&apos;s a daily workout for
              focus, memory and self-belief.
            </p>
          </div>

          <AnimatedList
            className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4"
            stagger={0.1}
          >
            {BENEFITS.map((b) => {
              const Icon = b.icon;
              return (
                <AnimatedItem key={b.title}>
                  <TiltedCard className="h-full">
                    <Card className="h-full rounded-3xl border-0 bg-white shadow-[0_8px_24px_rgba(26,31,75,0.06)]">
                      <CardContent className="p-6">
                        <span
                          className="inline-flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-md"
                          style={{ backgroundColor: b.color }}
                        >
                          <Icon className="h-6 w-6" />
                        </span>
                        <h3 className="mt-5 font-[family-name:var(--font-fredoka)] text-lg font-bold text-ck-navy">
                          {b.title}
                        </h3>
                        <p className="mt-2 text-sm text-ck-navy/70 leading-relaxed">
                          {b.body}
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
          <div className="text-center max-w-2xl mx-auto">
            <Badge variant="secondary" className="rounded-full bg-ck-cream text-ck-navy font-bold px-4">
              The eight-level journey
            </Badge>
            <h2 className="mt-4 font-[family-name:var(--font-fredoka)] text-3xl sm:text-4xl font-bold text-ck-navy">
              From first bead to{" "}
              <GradientText>mental abacus</GradientText>
            </h2>
          </div>

          <AnimatedList className="mt-10 grid gap-4 md:grid-cols-2" stagger={0.06}>
            {LEVELS.map((l, i) => (
              <AnimatedItem key={l.level}>
                <Card className="rounded-3xl border-0 bg-white shadow-[0_6px_18px_rgba(26,31,75,0.05)]">
                  <CardContent className="flex items-center gap-5 p-5">
                    <span
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white font-[family-name:var(--font-fredoka)] text-lg font-bold shadow-md"
                      style={{
                        backgroundColor: [
                          "#DC2638",
                          "#F39A1E",
                          "#2BAEEC",
                          "#D4318F",
                          "#8BC53F",
                          "#DC2638",
                          "#F39A1E",
                          "#2BAEEC",
                        ][i],
                      }}
                    >
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <p className="font-[family-name:var(--font-fredoka)] text-lg font-bold text-ck-navy">
                        {l.level}
                      </p>
                      <p className="text-sm text-ck-navy/70">{l.focus}</p>
                    </div>
                    <Badge variant="secondary" className="rounded-full bg-ck-cream text-ck-navy font-bold">
                      {l.weeks}
                    </Badge>
                  </CardContent>
                </Card>
              </AnimatedItem>
            ))}
          </AnimatedList>

          <div className="mt-12 rounded-3xl bg-gradient-to-br from-ck-cream via-white to-ck-sky p-8 sm:p-10 text-center">
            <Trophy className="mx-auto h-10 w-10 text-ck-orange" />
            <h3 className="mt-3 font-[family-name:var(--font-fredoka)] text-2xl sm:text-3xl font-bold text-ck-navy">
              Certificate at every level
            </h3>
            <p className="mt-2 text-ck-navy/70 max-w-md mx-auto">
              Each completed level earns a certificate and a celebratory event
              — because progress deserves a party.
            </p>
          </div>
        </div>
      </section>

      <Contact />
    </>
  );
}
