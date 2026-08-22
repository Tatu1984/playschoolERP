"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GradientText } from "@/components/reactbits/GradientText";
import { AnimatedList, AnimatedItem } from "@/components/reactbits/AnimatedList";
import { CheckCircle2 } from "lucide-react";

const PROGRAMS = [
  {
    id: "toddlers",
    label: "Toddlers",
    age: "1.5 – 2.5 yrs",
    color: "#F39A1E",
    headline: "First steps, first songs, first friends",
    outcomes: [
      "Sensory play & motor skills",
      "Listening & sound recognition",
      "Social smiles & sharing",
      "Self-feeding & potty training support",
    ],
  },
  {
    id: "nursery",
    label: "Nursery",
    age: "2.5 – 3.5 yrs",
    color: "#D4318F",
    headline: "Curious little explorers",
    outcomes: [
      "Alphabet & number introduction",
      "Color, shape & pattern play",
      "Story-led imagination",
      "Group activities & turn-taking",
    ],
  },
  {
    id: "jkg",
    label: "Junior KG",
    age: "3.5 – 4.5 yrs",
    color: "#2BAEEC",
    headline: "Reading, writing, wonder",
    outcomes: [
      "Phonics & sight words",
      "Counting & basic math",
      "Creative art & music",
      "Confident self-expression",
    ],
  },
  {
    id: "skg",
    label: "Senior KG",
    age: "4.5 – 5.5 yrs",
    color: "#8BC53F",
    headline: "Ready for big school",
    outcomes: [
      "Sentence building & comprehension",
      "Addition, subtraction & logic",
      "Science & nature concepts",
      "Independence & leadership",
    ],
  },
  {
    id: "summer",
    label: "Summer Camp",
    age: "All ages",
    color: "#DC2638",
    headline: "Holiday fun, holiday learning",
    outcomes: [
      "Splash, sports & adventure",
      "Cooking & craft labs",
      "Drama, dance & talent shows",
      "Field trips & friendships",
    ],
  },
];

export function Programs({ showHeading = true }: { showHeading?: boolean }) {
  return (
    <section id="programs" className="relative py-20 sm:py-28 bg-white/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {showHeading && (
          <div className="text-center max-w-2xl mx-auto mb-10">
            <Badge variant="secondary" className="rounded-full bg-ck-cream text-ck-navy font-bold px-4">
              Programs · Curriculum
            </Badge>
            <h2 className="mt-5 font-[family-name:var(--font-fredoka)] text-4xl sm:text-5xl font-bold text-ck-navy">
              A program for{" "}
              <GradientText>every little age</GradientText>
            </h2>
            <p className="mt-4 text-ck-navy/70">
              Carefully crafted milestones — so every climb up the ladder feels
              joyful and confident.
            </p>
          </div>
        )}

        <Tabs defaultValue="toddlers" className="mt-8">
          <TabsList className="mx-auto flex h-auto w-fit max-w-full flex-wrap justify-center gap-2 rounded-full bg-ck-cream/60 p-2">
            {PROGRAMS.map((p) => (
              <TabsTrigger
                key={p.id}
                value={p.id}
                className="rounded-full px-5 py-2 text-sm font-bold data-[state=active]:text-white data-[state=active]:shadow-md"
                style={
                  {
                    "--tw-prose-bullets": p.color,
                  } as React.CSSProperties
                }
              >
                <span className="data-[state=active]:bg-white">
                  {p.label}{" "}
                  <span className="ml-1 text-[10px] font-semibold opacity-70">
                    {p.age}
                  </span>
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          {PROGRAMS.map((p) => (
            <TabsContent key={p.id} value={p.id} className="mt-10">
              <Card
                className="rounded-3xl border-0 overflow-hidden relative"
                style={{ backgroundColor: `${p.color}15` }}
              >
                <div
                  aria-hidden
                  className="absolute -top-20 -right-20 h-72 w-72 rounded-full blur-3xl opacity-40"
                  style={{ backgroundColor: p.color }}
                />
                <CardContent className="relative grid gap-8 p-8 sm:p-12 lg:grid-cols-2">
                  <div>
                    {/*
                      Navy on a tint of the programme colour, not white on the
                      colour itself: white on ck-orange measures 2.22:1 where AA
                      wants 4.5:1. The colour still identifies the programme;
                      the words are still readable.
                    */}
                    <Badge
                      className="rounded-full text-ck-navy font-bold"
                      style={{ backgroundColor: `${p.color}33` }}
                    >
                      {p.age}
                    </Badge>
                    <h3
                      className="mt-4 font-[family-name:var(--font-fredoka)] text-3xl sm:text-4xl font-bold"
                      style={{ color: p.color }}
                    >
                      {p.label}
                    </h3>
                    <p className="mt-3 text-xl font-semibold text-ck-navy">
                      {p.headline}
                    </p>
                    <p className="mt-4 text-ck-navy/70 leading-relaxed">
                      Our {p.label.toLowerCase()} program is designed around your
                      child&apos;s natural pace of growth — with plenty of laughter,
                      hugs and learning along the way.
                    </p>
                  </div>

                  <AnimatedList className="grid gap-3 sm:grid-cols-2" stagger={0.08}>
                    {p.outcomes.map((o) => (
                      <AnimatedItem key={o}>
                        <div className="flex items-start gap-3 rounded-2xl bg-white p-4 shadow-sm">
                          <CheckCircle2
                            className="h-5 w-5 shrink-0"
                            style={{ color: p.color }}
                          />
                          <span className="text-sm font-semibold text-ck-navy">
                            {o}
                          </span>
                        </div>
                      </AnimatedItem>
                    ))}
                  </AnimatedList>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
}
