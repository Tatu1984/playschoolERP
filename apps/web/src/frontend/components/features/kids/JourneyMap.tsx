"use client";

import Link from "next/link";
import { Lock, Star } from "lucide-react";
import { useKidsProfile } from "@/frontend/hooks/useKidsProfile";
import { CATALOGUE } from "@/shared/fixtures";
import { cn } from "@/lib/utils";

/**
 * Adventure-style progression: every 10 stars unlocks the next world, and each
 * world holds three activities. Locked worlds show what it takes to open them.
 */
const WORLDS = [
  { name: "Balloon Meadow", emoji: "🎈", needStars: 0, slugs: ["balloon-pop", "shape-drop", "animal-sounds"] },
  { name: "Colour Cove", emoji: "🌈", needStars: 10, slugs: ["colour-sort", "letter-trace", "memory-match"] },
  { name: "Number Forest", emoji: "🌳", needStars: 20, slugs: ["count-along", "pattern-party"] },
  { name: "Word Waterfall", emoji: "💧", needStars: 30, slugs: ["word-builder"] },
  { name: "Science Summit", emoji: "🏔️", needStars: 45, slugs: ["math-adventure", "science-quiz"] },
];

export function JourneyMap() {
  const { child, journey } = useKidsProfile();

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h1 className="font-[family-name:var(--font-baloo)] text-2xl font-extrabold text-ck-navy">
          {child?.firstName ?? "Your"} journey
        </h1>
        <p className="text-sm font-semibold text-ck-navy/75">
          {journey.stars} stars collected · Level {journey.level}
        </p>
      </div>

      <ol className="relative space-y-4 pl-8">
        {/* the winding path */}
        <span className="absolute top-4 bottom-4 left-3 w-1 rounded-full bg-gradient-to-b from-ck-orange via-ck-blue to-ck-magenta" aria-hidden />

        {WORLDS.map((world, wi) => {
          const unlocked = journey.stars >= world.needStars;
          const games = world.slugs
            .map((slug) => CATALOGUE.games.find((g) => g.slug === slug))
            .filter((g): g is NonNullable<typeof g> => !!g);
          const done = games.filter((g) => journey.completedGames.includes(g.slug)).length;

          return (
            <li key={world.name} className="relative">
              <span
                className={cn(
                  "absolute top-4 -left-8 grid h-7 w-7 place-items-center rounded-full text-sm ring-4 ring-background",
                  unlocked ? "bg-ck-orange text-white" : "bg-muted text-muted-foreground",
                )}
                aria-hidden
              >
                {unlocked ? wi + 1 : <Lock className="h-3.5 w-3.5" />}
              </span>

              <div
                className={cn(
                  "rounded-3xl border-2 p-4 transition",
                  unlocked ? "border-transparent bg-card" : "border-dashed bg-muted/40 opacity-70",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={cn("text-4xl", !unlocked && "grayscale")} aria-hidden>
                      {world.emoji}
                    </span>
                    <div className="min-w-0">
                      <p className="font-[family-name:var(--font-baloo)] text-lg font-extrabold text-ck-navy">
                        {world.name}
                      </p>
                      <p className="text-xs font-semibold text-ck-navy/75">
                        {unlocked
                          ? `${done}/${games.length} finished`
                          : `Needs ${world.needStars} stars — you have ${journey.stars}`}
                      </p>
                    </div>
                  </div>
                  {unlocked && done === games.length && games.length > 0 && (
                    <span className="text-2xl" aria-label="World complete">
                      🏅
                    </span>
                  )}
                </div>

                {unlocked && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    {games.map((g) => {
                      const played = journey.completedGames.includes(g.slug);
                      return (
                        <Link
                          key={g.slug}
                          href={`/kids/games/${g.slug}`}
                          className={cn(
                            "flex items-center gap-2 rounded-2xl border p-2.5 transition hover:border-ck-red/40",
                            played && "border-ck-green/40 bg-ck-green/5",
                          )}
                        >
                          <span className="text-2xl" aria-hidden>
                            {g.emoji}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-[family-name:var(--font-baloo)] text-sm font-extrabold text-ck-navy">
                              {g.title}
                            </span>
                            <span className="flex items-center gap-0.5">
                              {Array.from({ length: 3 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={cn(
                                    "h-3 w-3",
                                    played ? "fill-ck-orange text-ck-orange" : "text-muted-foreground/40",
                                  )}
                                />
                              ))}
                            </span>
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
