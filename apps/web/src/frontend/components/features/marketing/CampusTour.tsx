"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Play, Volume2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Stop {
  id: string;
  name: string;
  emoji: string;
  /** Percent position on the campus map. */
  x: number;
  y: number;
  blurb: string;
  detail: string;
  facts: string[];
  teacher?: { name: string; emoji: string; line: string };
}

const STOPS: Stop[] = [
  {
    id: "gate",
    name: "The Gate",
    emoji: "🚪",
    x: 12,
    y: 72,
    blurb: "Where the day begins",
    detail:
      "One entrance, one exit, staffed from 8 AM. Every child is signed in by name and no one leaves without a matching pickup code.",
    facts: ["Biometric staff entry", "CCTV at the gate", "Single-point pickup queue"],
  },
  {
    id: "sunshine",
    name: "Sunshine Room",
    emoji: "🧸",
    x: 30,
    y: 40,
    blurb: "Toddlers · 1.5–2.5 yrs",
    detail:
      "Soft flooring, low shelves and everything washable. Two caregivers for every six children, and a nap corner behind the curtain.",
    facts: ["2:6 caregiver ratio", "Sensory bins daily", "Live camera for parents"],
    teacher: {
      name: "Meera Banerjee",
      emoji: "👩‍🏫",
      line: "The first week is about tears and trust. We do both slowly.",
    },
  },
  {
    id: "rainbow",
    name: "Rainbow Room",
    emoji: "🌈",
    x: 52,
    y: 32,
    blurb: "Nursery · 2.5–3.5 yrs",
    detail:
      "Phonics wall on the left, number trays on the right, a puppet theatre in the middle that gets used far more than either.",
    facts: ["Phonics A–Z", "Counting to 20", "Show & tell Fridays"],
    teacher: { name: "Ananya Ghosh", emoji: "👩‍🏫", line: "Ask any child here what /s/ sounds like. Go on." },
  },
  {
    id: "blossom",
    name: "Blossom Room",
    emoji: "📚",
    x: 70,
    y: 45,
    blurb: "Junior KG · 3.5–4.5 yrs",
    detail: "Reading nooks, a project table that is permanently mid-project, and a weather chart the children own entirely.",
    facts: ["CVC reading", "Theme projects", "Library hour"],
  },
  {
    id: "art",
    name: "Art & Messy Room",
    emoji: "🎨",
    x: 38,
    y: 65,
    blurb: "Paint, clay, glitter, regret",
    detail:
      "The only room with a drain in the floor, which tells you everything. Smocks on the hooks, drying rack by the window.",
    facts: ["Washable everything", "Weekly pottery", "Drying wall for 40 artworks"],
  },
  {
    id: "play",
    name: "Outdoor Play",
    emoji: "🛝",
    x: 62,
    y: 74,
    blurb: "Slides, sand, sprinklers",
    detail:
      "Shaded from 10 AM, soft-fall surface throughout, and a sand pit that gets sieved every Friday. Water play on Wednesdays.",
    facts: ["Soft-fall flooring", "Shade sails", "Water play Wednesdays"],
  },
  {
    id: "kitchen",
    name: "Kitchen",
    emoji: "🍲",
    x: 84,
    y: 62,
    blurb: "Freshly cooked, every day",
    detail:
      "Hot lunch cooked on site, menu on the noticeboard a week ahead, allergy list on the wall in red. No nuts on campus.",
    facts: ["Nut-free campus", "Weekly menu published", "FSSAI certified"],
  },
];

/**
 * Interactive campus walkthrough: a stylised map with clickable hotspots and a
 * guided "storytelling mode" that steps through every stop in order.
 * Placeholder art now; drops in 360° photos later without changing the flow.
 */
export function CampusTour() {
  const [openId, setOpenId] = useState<string | null>(null);
  const [guided, setGuided] = useState(false);
  const [index, setIndex] = useState(0);

  const active = guided ? STOPS[index] : STOPS.find((s) => s.id === openId);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ck-navy/70">
          {guided
            ? `Guided tour · stop ${index + 1} of ${STOPS.length}`
            : "Tap any spot on the map to look inside."}
        </p>
        <div className="flex gap-2">
          <Button
            variant={guided ? "default" : "outline"}
            className="rounded-xl font-bold"
            onClick={() => {
              setGuided((g) => !g);
              setIndex(0);
              setOpenId(null);
            }}
          >
            <Play /> {guided ? "Exit guided tour" : "Take the guided tour"}
          </Button>
        </div>
      </div>

      {/* the map */}
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[2rem] border-4 border-white bg-gradient-to-br from-ck-sky via-ck-cream/60 to-ck-peach shadow-xl">
        {/* decorative ground shapes */}
        <span className="absolute top-[18%] left-[8%] h-24 w-40 rounded-3xl bg-white/50" aria-hidden />
        <span className="absolute top-[55%] left-[45%] h-28 w-52 rounded-full bg-ck-green/25" aria-hidden />
        <span className="absolute top-[10%] right-[10%] h-20 w-28 rounded-2xl bg-white/40" aria-hidden />
        <span className="absolute bottom-[6%] left-[6%] text-3xl" aria-hidden>
          🌳
        </span>
        <span className="absolute top-[8%] left-[46%] text-3xl" aria-hidden>
          ☁️
        </span>
        <span className="absolute right-[6%] bottom-[10%] text-3xl" aria-hidden>
          🌻
        </span>

        {STOPS.map((stop, i) => {
          const isCurrent = active?.id === stop.id;
          return (
            <button
              key={stop.id}
              type="button"
              onClick={() => {
                setGuided(false);
                setOpenId(stop.id);
              }}
              aria-label={`${stop.name} — ${stop.blurb}`}
              style={{ left: `${stop.x}%`, top: `${stop.y}%` }}
              className={cn(
                "absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition",
                isCurrent ? "z-10 scale-110" : "hover:scale-110",
              )}
            >
              <span
                className={cn(
                  "grid h-12 w-12 place-items-center rounded-full border-4 bg-white text-2xl shadow-lg sm:h-14 sm:w-14",
                  isCurrent ? "animate-bob border-ck-red" : "border-white",
                )}
              >
                <span aria-hidden>{stop.emoji}</span>
              </span>
              <span className="mt-1 block max-w-24 text-[10px] leading-tight font-bold text-ck-navy">
                {stop.name}
              </span>
              {guided && i === index && (
                <span className="absolute -top-2 -right-2 grid h-5 w-5 place-items-center rounded-full bg-ck-red text-[10px] font-bold text-white">
                  {i + 1}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* guided controls */}
      {guided && (
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            className="rounded-xl font-bold"
            disabled={index === 0}
            onClick={() => setIndex((i) => i - 1)}
          >
            <ChevronLeft /> Previous
          </Button>
          <div className="flex gap-1.5">
            {STOPS.map((_, i) => (
              <span
                key={i}
                className={cn("h-2 rounded-full transition-all", i === index ? "w-6 bg-ck-red" : "w-2 bg-ck-navy/20")}
              />
            ))}
          </div>
          <Button
            className="rounded-xl font-bold"
            disabled={index === STOPS.length - 1}
            onClick={() => setIndex((i) => i + 1)}
          >
            Next <ChevronRight />
          </Button>
        </div>
      )}

      {/* stop detail */}
      {active && (
        <article className="rounded-3xl border bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="text-4xl" aria-hidden>
                {active.emoji}
              </span>
              <div className="min-w-0">
                <h2 className="font-[family-name:var(--font-fredoka)] text-xl font-bold text-ck-navy">{active.name}</h2>
                <p className="text-sm text-ck-navy/60">{active.blurb}</p>
              </div>
            </div>
            {!guided && (
              <Button size="icon-sm" variant="ghost" onClick={() => setOpenId(null)} aria-label="Close">
                <X />
              </Button>
            )}
          </div>

          <p className="mt-3 text-sm text-ck-navy/80">{active.detail}</p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {active.facts.map((f) => (
              <Badge key={f} variant="secondary" className="rounded-full">
                {f}
              </Badge>
            ))}
          </div>

          {active.teacher && (
            <div className="mt-4 flex items-start gap-3 rounded-2xl bg-ck-sky p-3">
              <span className="text-3xl" aria-hidden>
                {active.teacher.emoji}
              </span>
              <div>
                <p className="text-sm font-bold text-ck-navy">{active.teacher.name}</p>
                <p className="text-sm text-ck-navy/70">&ldquo;{active.teacher.line}&rdquo;</p>
              </div>
              <Volume2 className="ml-auto h-4 w-4 shrink-0 text-ck-navy/40" />
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild className="rounded-xl font-bold">
              <Link href="/admissions/visit">See it in person</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-xl font-bold">
              <Link href="/gallery">Photo gallery</Link>
            </Button>
          </div>
        </article>
      )}
    </div>
  );
}
