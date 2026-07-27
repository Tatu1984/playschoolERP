"use client";

import { useState } from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import { useKidsProfile } from "@/frontend/hooks/useKidsProfile";
import { CATALOGUE } from "@/shared/fixtures";
import { SKILL_LABELS, type AgeTier } from "@/shared/types/learning.types";
import { ACCENT_GRADIENT } from "@/frontend/utils/accents";
import { ageFrom } from "@/shared/utils/date.util";
import { cn } from "@/lib/utils";

const TIERS: { value: AgeTier | "all"; label: string }[] = [
  { value: "all", label: "All ages" },
  { value: "2-3", label: "2–3 yrs" },
  { value: "3-4", label: "3–4 yrs" },
  { value: "4-5", label: "4–5 yrs" },
  { value: "5-6", label: "5–6 yrs" },
];

/** Age-tiered catalogue. Defaults to the child's own tier. */
export function GamesCatalog() {
  const { child, journey } = useKidsProfile();
  const age = child ? ageFrom(child.dob) : 4;
  const ownTier: AgeTier = age < 3 ? "2-3" : age < 4 ? "3-4" : age < 5 ? "4-5" : "5-6";
  const [tier, setTier] = useState<AgeTier | "all">(ownTier);

  const games = tier === "all" ? CATALOGUE.games : CATALOGUE.games.filter((g) => g.ageTier === tier);

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h1 className="font-[family-name:var(--font-baloo)] text-2xl font-extrabold text-ck-navy">Games</h1>
        <p className="text-sm font-semibold text-ck-navy/60">
          {journey.completedGames.length} of {CATALOGUE.games.length} played · {journey.stars} stars
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {TIERS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTier(t.value)}
            className={cn(
              "rounded-full px-4 py-1.5 font-[family-name:var(--font-baloo)] text-sm font-extrabold transition",
              tier === t.value ? "bg-ck-red text-white" : "bg-white/70 text-ck-navy/70 hover:bg-white",
            )}
          >
            {t.label}
            {t.value === ownTier && " ⭐"}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {games.map((g) => {
          const done = journey.completedGames.includes(g.slug);
          return (
            <Link
              key={g.slug}
              href={`/kids/games/${g.slug}`}
              className={cn(
                "flex items-center gap-4 rounded-3xl bg-gradient-to-br p-4 transition hover:scale-[1.02] active:scale-95",
                ACCENT_GRADIENT[g.accent],
              )}
            >
              <span className="text-5xl" aria-hidden>
                {g.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-[family-name:var(--font-baloo)] text-lg font-extrabold text-ck-navy">{g.title}</p>
                <p className="truncate text-sm text-ck-navy/60">{g.tagline}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold text-ck-navy/70">
                    {g.ageTier} yrs
                  </span>
                  <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold text-ck-navy/70">
                    {SKILL_LABELS[g.skill]}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-center gap-1">
                {done ? (
                  <span className="text-2xl" aria-label="Completed">
                    ✅
                  </span>
                ) : (
                  <span className="flex items-center gap-0.5 text-ck-navy/40">
                    {Array.from({ length: g.maxStars }).map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5" />
                    ))}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
