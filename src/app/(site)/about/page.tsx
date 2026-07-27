import type { Metadata } from "next";
import { PageHeader } from "@/components/sections/PageHeader";
import { Pillars } from "@/components/sections/Pillars";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AnimatedList, AnimatedItem } from "@/components/reactbits/AnimatedList";
import { GradientText } from "@/components/reactbits/GradientText";
import { Heart, Sparkles, Lightbulb, Users } from "lucide-react";

export const metadata: Metadata = {
  title: "About · Climb Kiddo",
  description:
    "Climb Kiddo's vision, philosophy, and approach to early-years care, play and learning.",
};

const VALUES = [
  {
    icon: Heart,
    color: "#DC2638",
    title: "Warm, never strict",
    body: "Every child is met with patience and affection — never pressure.",
  },
  {
    icon: Sparkles,
    color: "#F39A1E",
    title: "Play is learning",
    body: "We follow the child's curiosity — every game has a hidden milestone.",
  },
  {
    icon: Lightbulb,
    color: "#2BAEEC",
    title: "Curiosity first",
    body: "Questions are celebrated. We give kids space to wonder out loud.",
  },
  {
    icon: Users,
    color: "#8BC53F",
    title: "Tiny ratios",
    body: "Small groups so every climber is seen, heard, and remembered.",
  },
];

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="About"
        title="A home where little"
        highlight="climbers thrive"
        description="Climb Kiddo blends daycare warmth, playschool wonder, and activity-class energy under one happy roof — built around how children actually grow."
      />

      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <Badge variant="secondary" className="rounded-full bg-ck-cream text-ck-navy font-bold px-4">
                Our story
              </Badge>
              <h2 className="mt-4 font-[family-name:var(--font-fredoka)] text-3xl sm:text-4xl font-bold text-ck-navy">
                Built by parents,{" "}
                <GradientText>for parents.</GradientText>
              </h2>
              <p className="mt-4 text-ck-navy/75 leading-relaxed">
                Climb Kiddo started with one question: where can I send my child
                and feel <em>truly</em> at ease? We couldn&apos;t find the answer, so
                we built it. Sunlit rooms, gentle caregivers, a curriculum
                shaped by child psychology, and daily updates that keep parents
                close — even when they&apos;re at work.
              </p>
              <p className="mt-4 text-ck-navy/75 leading-relaxed">
                Today, Climb Kiddo is home to over 200 children who run in with
                a hug and leave with a story to tell.
              </p>
            </div>

            <Card className="rounded-3xl border-0 bg-gradient-to-br from-ck-cream via-white to-ck-sky shadow-[0_20px_50px_rgba(26,31,75,0.08)]">
              <CardContent className="p-8 sm:p-10">
                <p className="font-[family-name:var(--font-fredoka)] text-2xl font-bold text-ck-navy">
                  Our promise
                </p>
                <ul className="mt-5 space-y-3 text-ck-navy/85">
                  <li>• Safe, sunlit spaces designed at kid-height</li>
                  <li>• Caregivers trained in early childhood education</li>
                  <li>• Nutritious meals, fresh every day</li>
                  <li>• Daily photo updates for every parent</li>
                  <li>• A curriculum that follows your child — not the other way around</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16 bg-white/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <Badge variant="secondary" className="rounded-full bg-ck-cream text-ck-navy font-bold px-4">
              Our values
            </Badge>
            <h2 className="mt-4 font-[family-name:var(--font-fredoka)] text-3xl sm:text-4xl font-bold text-ck-navy">
              Four things we never{" "}
              <GradientText>compromise on</GradientText>
            </h2>
          </div>

          <AnimatedList
            className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4"
            stagger={0.1}
          >
            {VALUES.map((v) => {
              const Icon = v.icon;
              return (
                <AnimatedItem key={v.title}>
                  <Card className="h-full rounded-3xl border-0 bg-white shadow-[0_8px_24px_rgba(26,31,75,0.06)]">
                    <CardContent className="p-6">
                      <span
                        className="inline-flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-md"
                        style={{ backgroundColor: v.color }}
                      >
                        <Icon className="h-6 w-6" />
                      </span>
                      <h3 className="mt-5 font-[family-name:var(--font-fredoka)] text-lg font-bold text-ck-navy">
                        {v.title}
                      </h3>
                      <p className="mt-2 text-sm text-ck-navy/70 leading-relaxed">
                        {v.body}
                      </p>
                    </CardContent>
                  </Card>
                </AnimatedItem>
              );
            })}
          </AnimatedList>
        </div>
      </section>

      <Pillars />
    </>
  );
}
