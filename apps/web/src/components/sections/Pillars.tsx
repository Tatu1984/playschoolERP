"use client";

import Link from "next/link";
import { TiltedCard } from "@/components/reactbits/TiltedCard";
import { AnimatedList, AnimatedItem } from "@/components/reactbits/AnimatedList";
import { GradientText } from "@/components/reactbits/GradientText";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Baby, BookOpen, Drum, ArrowUpRight } from "lucide-react";

const PILLARS = [
  {
    label: "Daycare",
    color: "#8BC53F",
    soft: "rgba(139,197,63,0.15)",
    icon: Baby,
    tag: "0 to 5 yrs",
    title: "Safe, snuggly second home",
    points: [
      "Trained caregivers · CCTV monitored",
      "Nutritious meals & nap pods",
      "Flexible half / full / extended day",
    ],
    href: "/programs",
  },
  {
    label: "Playschool",
    color: "#D4318F",
    soft: "rgba(212,49,143,0.15)",
    icon: BookOpen,
    tag: "Toddler · Nursery · KG",
    title: "Learn through play, every day",
    points: [
      "Phonics, numbers, motor skills",
      "Story circles & guided discovery",
      "Bright, child-sized classrooms",
    ],
    href: "/programs",
  },
  {
    label: "Kids Activity",
    color: "#2BAEEC",
    soft: "rgba(43,174,236,0.15)",
    icon: Drum,
    tag: "After-school & Weekends",
    title: "Sports, art, music & more",
    points: [
      "Dance · Karate · Drawing · Drum",
      "Summer & winter holiday camps",
      "Confidence-building stage shows",
    ],
    href: "/activities",
  },
];

export function Pillars() {
  return (
    <section id="about" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto">
          <Badge variant="secondary" className="rounded-full bg-ck-cream text-ck-navy font-bold px-4">
            Three programs · One happy place
          </Badge>
          <h2 className="mt-5 font-[family-name:var(--font-fredoka)] text-4xl sm:text-5xl font-bold text-ck-navy">
            Everything your little one needs to{" "}
            <GradientText>climb higher</GradientText>
          </h2>
          <p className="mt-4 text-ck-navy/70 leading-relaxed">
            From cuddly daycare days to confident classroom adventures, Climb
            Kiddo blends care, learning and play in age-perfect ways.
          </p>
        </div>

        <AnimatedList className="mt-14 grid gap-6 md:grid-cols-3" stagger={0.14}>
          {PILLARS.map((p) => {
            const Icon = p.icon;
            return (
              <AnimatedItem key={p.label}>
                <Link
                  href={p.href}
                  className="group block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 rounded-3xl"
                  style={{ ["--tw-ring-color" as string]: p.color }}
                  aria-label={`Learn more about ${p.label}`}
                >
                  <TiltedCard className="h-full">
                    <Card
                      className="h-full rounded-3xl border-0 overflow-hidden relative cursor-pointer"
                      style={{ backgroundColor: p.soft }}
                    >
                      <div
                        className="absolute -top-12 -right-12 h-40 w-40 rounded-full opacity-30 blur-2xl"
                        style={{ backgroundColor: p.color }}
                      />
                      <CardContent className="relative p-7">
                        <div className="flex items-center justify-between">
                          <span
                            className="inline-flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-lg"
                            style={{ backgroundColor: p.color }}
                          >
                            <Icon className="h-7 w-7" />
                          </span>
                          <Badge
                            className="rounded-full font-bold text-white"
                            style={{ backgroundColor: p.color }}
                          >
                            {p.tag}
                          </Badge>
                        </div>
                        <h3
                          className="mt-6 font-[family-name:var(--font-fredoka)] text-2xl font-bold"
                          style={{ color: p.color }}
                        >
                          {p.label}
                        </h3>
                        <p className="mt-1 text-lg font-semibold text-ck-navy">
                          {p.title}
                        </p>
                        <ul className="mt-5 space-y-2 text-sm text-ck-navy/80">
                          {p.points.map((pt) => (
                            <li key={pt} className="flex gap-2">
                              <span
                                className="mt-2 inline-block h-1.5 w-1.5 rounded-full"
                                style={{ backgroundColor: p.color }}
                              />
                              {pt}
                            </li>
                          ))}
                        </ul>
                        <div
                          className="mt-6 flex items-center gap-1 text-sm font-bold transition-transform group-hover:translate-x-1"
                          style={{ color: p.color }}
                        >
                          Learn more
                          <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                        </div>
                      </CardContent>
                    </Card>
                  </TiltedCard>
                </Link>
              </AnimatedItem>
            );
          })}
        </AnimatedList>
      </div>
    </section>
  );
}
