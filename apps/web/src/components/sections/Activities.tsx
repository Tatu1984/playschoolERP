"use client";

import { Marquee } from "@/components/reactbits/Marquee";
import { Badge } from "@/components/ui/badge";
import { GradientText } from "@/components/reactbits/GradientText";
import {
  Palette,
  Music,
  Bike,
  Dumbbell,
  Drama,
  Sparkles,
  Trees,
  ChefHat,
  Drum,
  Wand2,
  Brush,
  Puzzle,
} from "lucide-react";

const ACTIVITIES = [
  { label: "Storytelling", icon: Wand2, color: "#D4318F" },
  { label: "Drawing", icon: Brush, color: "#F39A1E" },
  { label: "Dance", icon: Drama, color: "#DC2638" },
  { label: "Drum & Music", icon: Drum, color: "#2BAEEC" },
  { label: "Yoga", icon: Sparkles, color: "#8BC53F" },
  { label: "Cycling", icon: Bike, color: "#F39A1E" },
  { label: "Karate", icon: Dumbbell, color: "#DC2638" },
  { label: "Painting", icon: Palette, color: "#D4318F" },
  { label: "Nature Walks", icon: Trees, color: "#8BC53F" },
  { label: "Cooking", icon: ChefHat, color: "#F39A1E" },
  { label: "Puzzles", icon: Puzzle, color: "#2BAEEC" },
  { label: "Music Circles", icon: Music, color: "#D4318F" },
];

export function Activities({ showHeading = true }: { showHeading?: boolean }) {
  return (
    <section id="activities" className="relative py-20 sm:py-24">
      {showHeading && (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <Badge variant="secondary" className="rounded-full bg-ck-cream text-ck-navy font-bold px-4">
            A day at Climb Kiddo
          </Badge>
          <h2 className="mt-5 font-[family-name:var(--font-fredoka)] text-4xl sm:text-5xl font-bold text-ck-navy">
            Twelve happy ways to <GradientText>learn & play</GradientText>
          </h2>
          <p className="mt-4 text-ck-navy/70 max-w-2xl mx-auto">
            From quiet story corners to noisy drum circles — every day is a brand
            new adventure.
          </p>
        </div>
      )}

      <div className={`${showHeading ? "mt-12" : ""} [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]`}>
        <Marquee>
          {ACTIVITIES.map((a) => {
            const Icon = a.icon;
            return (
              <div
                key={a.label}
                className="flex shrink-0 items-center gap-3 rounded-2xl bg-white px-5 py-4 shadow-[0_4px_18px_rgba(26,31,75,0.06)] ring-1 ring-ck-navy/5"
              >
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
                  style={{ backgroundColor: a.color }}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="font-bold text-ck-navy whitespace-nowrap">
                  {a.label}
                </span>
              </div>
            );
          })}
        </Marquee>
      </div>
    </section>
  );
}
