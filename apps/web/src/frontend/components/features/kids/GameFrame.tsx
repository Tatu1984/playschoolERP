"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { RotateCcw, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useErpStore } from "@/frontend/store/erpStore";
import { useKidsProfile } from "@/frontend/hooks/useKidsProfile";
import { CATALOGUE } from "@/shared/fixtures";
import type { Game } from "@/shared/types/learning.types";
import { MASCOTS, cheerFor } from "./mascots";
import { ACCENT_GRADIENT } from "@/frontend/utils/accents";
import { cn } from "@/lib/utils";

export type GamePhase = "intro" | "playing" | "won";

/**
 * Shared chrome + lifecycle for every mini-game: intro card, live score,
 * win screen, star award (written through the store) and badge unlocks.
 * Engines only render the play area and call `onScore` / `onFinish`.
 */
export function GameFrame({
  game,
  rounds,
  children,
  score,
  round,
  phase,
  onStart,
  onRestart,
}: {
  game: Game;
  rounds: number;
  children: React.ReactNode;
  score: number;
  round: number;
  phase: GamePhase;
  onStart: () => void;
  onRestart: () => void;
}) {
  const { child, journey } = useKidsProfile();
  const finishGame = useErpStore((s) => s.finishGame);
  const mascot = MASCOTS[journey.mascot];
  const awardedFor = useRef<string | null>(null);

  const stars = score >= rounds ? 3 : score >= Math.ceil(rounds * 0.7) ? 2 : score > 0 ? 1 : 0;

  // Award exactly once per win. The effect only writes to the store (an external
  // system) — the badge list below is derived, so there is no local state to sync.
  useEffect(() => {
    if (phase !== "won") {
      awardedFor.current = null;
      return;
    }
    if (!child || awardedFor.current === game.slug) return;
    awardedFor.current = game.slug;
    finishGame(child.id, game.slug, score, stars, rounds * 6);
  }, [phase, child, finishGame, game.slug, score, stars, rounds]);

  // Badges whose threshold was crossed by the stars just earned.
  const freshBadges =
    phase === "won" && stars > 0
      ? CATALOGUE.badges.filter(
          (b) =>
            journey.unlockedBadges.includes(b.key) &&
            b.requiredStars > journey.stars - stars &&
            b.requiredStars <= journey.stars,
        )
      : [];

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-gradient-to-br p-4",
          ACCENT_GRADIENT[game.accent],
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="text-4xl" aria-hidden>
            {game.emoji}
          </span>
          <div className="min-w-0">
            <h1 className="font-[family-name:var(--font-baloo)] text-xl font-extrabold text-ck-navy">{game.title}</h1>
            <p className="truncate text-sm text-ck-navy/75">{game.tagline}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {phase === "playing" && (
            <>
              <span className="rounded-full bg-white/70 px-3 py-1 text-sm font-extrabold text-ck-navy">
                {round}/{rounds}
              </span>
              <span className="flex items-center gap-1 rounded-full bg-white/70 px-3 py-1 text-sm font-extrabold text-amber-700">
                <Star className="h-4 w-4 fill-ck-orange text-ck-orange" />
                {score}
              </span>
            </>
          )}
          <Button variant="ghost" size="icon-sm" asChild aria-label="Close the game">
            <Link href="/kids/games">
              <X />
            </Link>
          </Button>
        </div>
      </div>

      {phase === "intro" && (
        <div className="rounded-3xl border bg-card p-6 text-center">
          <span className="mb-2 block text-5xl" aria-hidden>
            {mascot.emoji}
          </span>
          <p className="font-[family-name:var(--font-baloo)] text-lg font-extrabold text-ck-navy">
            {mascot.name} says:
          </p>
          <p className="mx-auto mt-1 max-w-md text-base text-muted-foreground">{game.instructions}</p>
          <Button size="lg" className="mt-4 h-12 px-8 text-base font-extrabold" onClick={onStart}>
            Let&apos;s play!
          </Button>
        </div>
      )}

      {phase === "playing" && <div className="rounded-3xl border bg-card p-4 sm:p-6">{children}</div>}

      {phase === "won" && (
        <div className="relative overflow-hidden rounded-3xl border bg-card p-6 text-center">
          <Confetti />
          <span className="mb-2 block text-6xl" aria-hidden>
            {mascot.emoji}
          </span>
          <p className="font-[family-name:var(--font-baloo)] text-2xl font-extrabold text-ck-navy">
            {cheerFor(mascot, score + rounds)}
          </p>
          <p className="mt-1 text-muted-foreground">
            You got {score} of {rounds} right.
          </p>
          <div className="mt-3 flex justify-center gap-1.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <Star
                key={i}
                className={cn(
                  "h-10 w-10 transition",
                  i < stars ? "animate-bob fill-ck-orange text-ck-orange" : "text-muted",
                )}
                style={{ animationDelay: `${i * 120}ms` }}
              />
            ))}
          </div>

          {freshBadges.length > 0 && (
            <div className="mx-auto mt-4 max-w-sm rounded-2xl bg-ck-orange/15 p-3">
              <p className="text-sm font-extrabold text-amber-800">New badge unlocked!</p>
              <div className="mt-1 flex flex-wrap justify-center gap-2">
                {freshBadges.map((badge) => (
                  <span key={badge.key} className="rounded-full bg-white px-3 py-1 text-sm font-bold">
                    {badge.emoji} {badge.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button size="lg" className="h-12 px-6 font-extrabold" onClick={onRestart}>
              <RotateCcw /> Play again
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-6 font-extrabold" asChild>
              <Link href="/kids/games">More games</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** CSS-only confetti burst — no library, no canvas. */
function Confetti() {
  const pieces = Array.from({ length: 28 }, (_, i) => i);
  const colors = ["#DC2638", "#F39A1E", "#2BAEEC", "#8BC53F", "#D4318F"];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {pieces.map((i) => (
        <span
          key={i}
          className="absolute block h-2 w-2 animate-float rounded-sm"
          style={{
            left: `${(i * 37) % 100}%`,
            top: `${(i * 53) % 60}%`,
            background: colors[i % colors.length],
            animationDelay: `${(i % 9) * 120}ms`,
            transform: `rotate(${(i * 41) % 360}deg)`,
            opacity: 0.75,
          }}
        />
      ))}
    </div>
  );
}
