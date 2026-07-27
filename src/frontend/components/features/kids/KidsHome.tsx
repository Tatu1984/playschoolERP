"use client";

import Link from "next/link";
import { toast } from "sonner";
import { Check, Flame, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useErpStore } from "@/frontend/store/erpStore";
import { useKidsProfile } from "@/frontend/hooks/useKidsProfile";
import { CATALOGUE } from "@/shared/fixtures";
import { studentName } from "@/frontend/store/queries";
import { MASCOT_LIST, MASCOTS } from "./mascots";
import { ACCENT_GRADIENT } from "@/frontend/utils/accents";
import { cn } from "@/lib/utils";

const TILES = [
  { href: "/kids/games", emoji: "🎮", label: "Games", tone: "from-ck-red/20 to-ck-orange/15" },
  { href: "/kids/stories", emoji: "📖", label: "Stories", tone: "from-ck-blue/20 to-ck-green/15" },
  { href: "/kids/draw", emoji: "🎨", label: "Draw", tone: "from-ck-magenta/20 to-ck-lavender/40" },
  { href: "/kids/music", emoji: "🎹", label: "Music", tone: "from-ck-green/20 to-ck-blue/15" },
  { href: "/kids/journey", emoji: "🗺️", label: "Journey", tone: "from-ck-orange/20 to-ck-red/15" },
  { href: "/kids/rewards", emoji: "🏆", label: "Rewards", tone: "from-ck-navy/15 to-ck-blue/15" },
];

export function KidsHome() {
  const { child, kids, journey, setKid } = useKidsProfile();
  const setMascot = useErpStore((s) => s.setMascot);
  const mascot = MASCOTS[journey.mascot];

  const nextGame = CATALOGUE.games.find((g) => !journey.completedGames.includes(g.slug)) ?? CATALOGUE.games[0];

  return (
    <div className="space-y-5">
      {/* greeting */}
      <div className={cn("rounded-[2rem] bg-gradient-to-br p-5 text-center", mascot.bg)}>
        <span className="block animate-bob text-7xl" aria-hidden>
          {mascot.emoji}
        </span>
        <h1 className="mt-2 font-[family-name:var(--font-baloo)] text-2xl font-extrabold text-ck-navy sm:text-3xl">
          Hi {child?.firstName ?? "friend"}!
        </h1>
        <p className="text-sm font-semibold text-ck-navy/60">
          {mascot.name} is ready to play. You have {journey.stars} stars.
        </p>

        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <span className="flex items-center gap-1 rounded-full bg-white/80 px-3 py-1 text-sm font-extrabold text-amber-700">
            <Star className="h-4 w-4 fill-ck-orange text-ck-orange" /> {journey.stars}
          </span>
          <span className="flex items-center gap-1 rounded-full bg-white/80 px-3 py-1 text-sm font-extrabold text-ck-red">
            <Flame className="h-4 w-4" /> {journey.streakDays}-day streak
          </span>
          <span className="rounded-full bg-white/80 px-3 py-1 text-sm font-extrabold text-sky-700">
            Level {journey.level}
          </span>
        </div>

        <Button size="lg" className="mt-4 h-14 rounded-2xl px-8 text-lg font-extrabold" asChild>
          <Link href={`/kids/games/${nextGame.slug}`}>Play {nextGame.title} {nextGame.emoji}</Link>
        </Button>
      </div>

      {/* big tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {TILES.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "flex min-h-32 flex-col items-center justify-center gap-2 rounded-3xl bg-gradient-to-br p-4 transition hover:scale-[1.03] active:scale-95",
              t.tone,
            )}
          >
            <span className="text-5xl" aria-hidden>
              {t.emoji}
            </span>
            <span className="font-[family-name:var(--font-baloo)] text-lg font-extrabold text-ck-navy">{t.label}</span>
          </Link>
        ))}
      </div>

      {/* mascot picker */}
      <section className="rounded-3xl border bg-card p-4">
        <h2 className="mb-3 text-center font-[family-name:var(--font-baloo)] text-lg font-extrabold text-ck-navy">
          Pick your buddy
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {MASCOT_LIST.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => {
                if (!child) return;
                setMascot(child.id, m.key);
                toast.success(`${m.name} is your buddy now!`);
              }}
              className={cn(
                "flex flex-col items-center gap-1 rounded-2xl border-2 p-3 transition active:scale-95",
                journey.mascot === m.key ? "border-ck-red bg-ck-red/5" : "border-border hover:border-ck-blue",
              )}
            >
              <span className="text-4xl" aria-hidden>
                {m.emoji}
              </span>
              <span className="font-[family-name:var(--font-baloo)] text-sm font-extrabold text-ck-navy">{m.name}</span>
              <span className="text-[10px] text-muted-foreground">{m.tagline}</span>
              {journey.mascot === m.key && <Check className="h-3.5 w-3.5 text-ck-red" />}
            </button>
          ))}
        </div>
      </section>

      {/* who's playing */}
      {kids.length > 1 && (
        <section className="rounded-3xl border bg-card p-4">
          <h2 className="mb-3 text-center font-[family-name:var(--font-baloo)] text-lg font-extrabold text-ck-navy">
            Who&apos;s playing?
          </h2>
          <div className="flex flex-wrap justify-center gap-2">
            {kids.map((k) => (
              <button
                key={k.id}
                type="button"
                onClick={() => {
                  setKid(k.id);
                  toast.success(`${k.firstName}'s turn!`);
                }}
                className={cn(
                  "flex items-center gap-2 rounded-2xl border-2 px-3 py-2 font-[family-name:var(--font-baloo)] font-extrabold transition",
                  child?.id === k.id ? "border-ck-red bg-ck-red/5 text-ck-red" : "border-border hover:border-ck-blue",
                )}
              >
                <span aria-hidden>{k.photoEmoji}</span>
                {studentName(k).split(" ")[0]}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* recommended */}
      <section>
        <h2 className="mb-2 font-[family-name:var(--font-baloo)] text-lg font-extrabold text-ck-navy">
          Just right for you
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {CATALOGUE.games.slice(0, 4).map((g) => (
            <Link
              key={g.slug}
              href={`/kids/games/${g.slug}`}
              className={cn(
                "flex items-center gap-3 rounded-2xl bg-gradient-to-br p-3 transition hover:scale-[1.02]",
                ACCENT_GRADIENT[g.accent],
              )}
            >
              <span className="text-4xl" aria-hidden>
                {g.emoji}
              </span>
              <span className="min-w-0">
                <span className="block font-[family-name:var(--font-baloo)] font-extrabold text-ck-navy">{g.title}</span>
                <span className="block truncate text-xs text-ck-navy/60">{g.tagline}</span>
              </span>
              {journey.completedGames.includes(g.slug) && (
                <span className="ml-auto shrink-0 text-lg" aria-label="Completed">
                  ✅
                </span>
              )}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
