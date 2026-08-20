"use client";

import { Counter } from "@/components/reactbits/Counter";
import { DotGrid } from "@/components/reactbits/DotGrid";
import { Squares } from "@/components/reactbits/Squares";
import { AnimatedList, AnimatedItem } from "@/components/reactbits/AnimatedList";
import { GradientText } from "@/components/reactbits/GradientText";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  HeartHandshake,
  Smile,
  Camera,
  Salad,
  GraduationCap,
} from "lucide-react";

const REASONS = [
  {
    icon: ShieldCheck,
    color: "#8BC53F",
    title: "Safety first, always",
    body: "CCTV across every corner, verified pickup, child-safe materials & first-aid trained staff.",
  },
  {
    icon: HeartHandshake,
    color: "#DC2638",
    title: "Caregivers who care",
    body: "A 1:8 caregiver ratio so every child feels seen, held and heard.",
  },
  {
    icon: Smile,
    color: "#F39A1E",
    title: "Joyful curriculum",
    body: "Play-based learning aligned to early-years milestones — never rote, always fun.",
  },
  {
    icon: Camera,
    color: "#2BAEEC",
    title: "Daily updates for parents",
    body: "Photos, notes, meal & nap logs delivered to your phone every single day.",
  },
  {
    icon: Salad,
    color: "#D4318F",
    title: "Wholesome meals",
    body: "Freshly cooked, dietician-approved meals & snacks. Allergy-aware kitchen.",
  },
  {
    icon: GraduationCap,
    color: "#1A1F4B",
    title: "Big-school ready",
    body: "Children leave Climb Kiddo confident, curious and ready for primary school.",
  },
];

const STATS = [
  { value: 200, suffix: "+", label: "Happy little climbers", color: "#DC2638" },
  { value: 12, suffix: "+", label: "Trained caregivers", color: "#F39A1E" },
  { value: 24, suffix: "/7", label: "CCTV monitored", color: "#2BAEEC" },
  { value: 6, suffix: "yrs", label: "Of joyful learning", color: "#8BC53F" },
];

export function WhyUs({ showHeading = true }: { showHeading?: boolean }) {
  return (
    <section id="why" className="relative py-20 sm:py-28 overflow-hidden">
      <Squares className="opacity-60" />
      <DotGrid className="opacity-50" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {showHeading && (
          <div className="text-center max-w-2xl mx-auto">
            <Badge variant="secondary" className="rounded-full bg-ck-cream text-ck-navy font-bold px-4">
              Why parents choose us
            </Badge>
            <h2 className="mt-5 font-[family-name:var(--font-fredoka)] text-4xl sm:text-5xl font-bold text-ck-navy">
              A home away from home where{" "}
              <GradientText>kids really thrive</GradientText>
            </h2>
          </div>
        )}

        <AnimatedList
          className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4"
          stagger={0.1}
        >
          {STATS.map((s) => (
            <AnimatedItem key={s.label}>
              <div
                className="rounded-3xl bg-white/85 backdrop-blur p-6 text-center shadow-[0_8px_30px_rgba(26,31,75,0.06)] ring-1 ring-ck-navy/5"
              >
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

        <AnimatedList
          className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3"
          stagger={0.08}
        >
          {REASONS.map((r) => {
            const Icon = r.icon;
            return (
              <AnimatedItem key={r.title}>
                <Card className="h-full rounded-3xl border-0 bg-white/85 backdrop-blur shadow-[0_8px_24px_rgba(26,31,75,0.06)] hover:shadow-[0_16px_40px_rgba(26,31,75,0.10)] transition-shadow">
                  <CardContent className="p-7">
                    <span
                      className="inline-flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-md"
                      style={{ backgroundColor: r.color }}
                    >
                      <Icon className="h-6 w-6" />
                    </span>
                    <h3 className="mt-5 font-[family-name:var(--font-fredoka)] text-xl font-bold text-ck-navy">
                      {r.title}
                    </h3>
                    <p className="mt-2 text-sm text-ck-navy/70 leading-relaxed">
                      {r.body}
                    </p>
                  </CardContent>
                </Card>
              </AnimatedItem>
            );
          })}
        </AnimatedList>
      </div>
    </section>
  );
}
