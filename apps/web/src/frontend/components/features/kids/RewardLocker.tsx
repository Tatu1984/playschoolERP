"use client";

import Link from "next/link";
import { Flame, Lock, Star, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useErpStore } from "@/frontend/store/erpStore";
import { useKidsProfile } from "@/frontend/hooks/useKidsProfile";
import { CATALOGUE } from "@/shared/fixtures";
import { MASCOTS } from "./mascots";
import { formatDate } from "@/frontend/utils/formatters";
import { cn } from "@/lib/utils";

export function RewardLocker() {
  const { child, journey } = useKidsProfile();
  const sessions = useErpStore((s) => s.gameSessions);
  const artworks = useErpStore((s) => s.artworks);
  const mascot = MASCOTS[journey.mascot];

  const mySessions = sessions.filter((s) => s.studentId === child?.id);
  const nextBadge = CATALOGUE.badges.find((b) => !journey.unlockedBadges.includes(b.key));
  const toNext = nextBadge ? Math.max(0, nextBadge.requiredStars - journey.stars) : 0;

  return (
    <div className="space-y-5">
      <div className="rounded-[2rem] bg-gradient-to-br from-ck-orange/25 to-ck-red/15 p-5 text-center">
        <span className="block text-6xl" aria-hidden>
          🏆
        </span>
        <h1 className="mt-1 font-[family-name:var(--font-baloo)] text-2xl font-extrabold text-ck-navy">
          {child?.firstName ?? "Your"} rewards
        </h1>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <span className="flex items-center gap-1 rounded-full bg-white/80 px-3 py-1 text-sm font-extrabold text-amber-700">
            <Star className="h-4 w-4 fill-ck-orange text-ck-orange" /> {journey.stars} stars
          </span>
          <span className="flex items-center gap-1 rounded-full bg-white/80 px-3 py-1 text-sm font-extrabold text-ck-red">
            <Flame className="h-4 w-4" /> {journey.streakDays}-day streak
          </span>
          <span className="flex items-center gap-1 rounded-full bg-white/80 px-3 py-1 text-sm font-extrabold text-sky-700">
            <Trophy className="h-4 w-4" /> {journey.unlockedBadges.length}/{CATALOGUE.badges.length} badges
          </span>
        </div>

        {nextBadge && (
          <div className="mx-auto mt-4 max-w-sm">
            <p className="text-xs font-bold text-ck-navy/70">
              {toNext > 0
                ? `${toNext} more star${toNext === 1 ? "" : "s"} to unlock ${nextBadge.emoji} ${nextBadge.label}`
                : `${nextBadge.emoji} ${nextBadge.label} is ready!`}
            </p>
            <Progress
              value={Math.min(100, (journey.stars / Math.max(1, nextBadge.requiredStars)) * 100)}
              className="mt-1.5"
            />
          </div>
        )}
      </div>

      {/* badges */}
      <section>
        <h2 className="mb-2 font-[family-name:var(--font-baloo)] text-lg font-extrabold text-ck-navy">Badge locker</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {CATALOGUE.badges.map((badge) => {
            const unlocked = journey.unlockedBadges.includes(badge.key);
            return (
              <div
                key={badge.key}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-2xl border-2 p-3 text-center transition",
                  unlocked ? "border-ck-orange/40 bg-ck-orange/10" : "border-dashed bg-muted/40",
                )}
              >
                <span className={cn("text-4xl", !unlocked && "opacity-30 grayscale")} aria-hidden>
                  {unlocked ? badge.emoji : "🔒"}
                </span>
                <p className="font-[family-name:var(--font-baloo)] text-sm font-extrabold text-ck-navy">{badge.label}</p>
                <p className="text-[10px] text-muted-foreground">{badge.description}</p>
                {!unlocked && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
                    <Lock className="h-2.5 w-2.5" /> {badge.requiredStars} stars
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* collections */}
      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-3xl border bg-card p-4">
          <h2 className="mb-2 font-[family-name:var(--font-baloo)] text-base font-extrabold text-ck-navy">
            Games finished ({journey.completedGames.length})
          </h2>
          {journey.completedGames.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">
              None yet —{" "}
              <Link href="/kids/games" className="font-bold text-ck-red hover:underline">
                pick a game
              </Link>
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {journey.completedGames.map((slug) => {
                const game = CATALOGUE.games.find((g) => g.slug === slug);
                return game ? (
                  <span key={slug} className="rounded-full bg-muted px-2.5 py-1 text-xs font-bold">
                    {game.emoji} {game.title}
                  </span>
                ) : null;
              })}
            </div>
          )}
        </section>

        <section className="rounded-3xl border bg-card p-4">
          <h2 className="mb-2 font-[family-name:var(--font-baloo)] text-base font-extrabold text-ck-navy">
            Stories read ({journey.finishedStories.length})
          </h2>
          {journey.finishedStories.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">
              None yet —{" "}
              <Link href="/kids/stories" className="font-bold text-ck-red hover:underline">
                read one
              </Link>
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {journey.finishedStories.map((id) => {
                const story = CATALOGUE.stories.find((s) => s.id === id);
                return story ? (
                  <span key={id} className="rounded-full bg-muted px-2.5 py-1 text-xs font-bold">
                    {story.emoji} {story.title}
                  </span>
                ) : null;
              })}
            </div>
          )}
        </section>
      </div>

      {/* history */}
      {mySessions.length > 0 && (
        <section className="rounded-3xl border bg-card p-4">
          <h2 className="mb-2 font-[family-name:var(--font-baloo)] text-base font-extrabold text-ck-navy">
            Recent play
          </h2>
          <ul className="divide-y">
            {mySessions.slice(0, 8).map((s) => {
              const game = CATALOGUE.games.find((g) => g.slug === s.gameSlug);
              return (
                <li key={s.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <span aria-hidden>{game?.emoji ?? "🎮"}</span>
                    <span className="truncate font-medium">{game?.title ?? s.gameSlug}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                    {formatDate(s.createdAt)}
                    <span className="flex items-center gap-0.5">
                      {Array.from({ length: s.stars }).map((_, i) => (
                        <Star key={i} className="h-3 w-3 fill-ck-orange text-ck-orange" />
                      ))}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="rounded-3xl bg-gradient-to-br from-ck-blue/15 to-ck-green/15 p-4 text-center">
        <span className="block text-4xl" aria-hidden>
          {mascot.emoji}
        </span>
        <p className="mt-1 font-[family-name:var(--font-baloo)] text-base font-extrabold text-ck-navy">
          {mascot.name} says: keep going, you&apos;re doing brilliantly!
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <Button asChild className="font-extrabold">
            <Link href="/kids/games">Play a game</Link>
          </Button>
          {artworks.length > 0 && (
            <Button asChild variant="outline" className="font-extrabold">
              <Link href="/kids/draw">See my drawings ({artworks.length})</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
