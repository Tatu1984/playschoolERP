"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Game } from "@/shared/types/learning.types";
import { GameFrame, type GamePhase } from "../GameFrame";
import { cn } from "@/lib/utils";

const WORDS = [
  { word: "CAT", emoji: "🐱" },
  { word: "SUN", emoji: "☀️" },
  { word: "BUS", emoji: "🚌" },
  { word: "HAT", emoji: "🎩" },
  { word: "DOG", emoji: "🐶" },
  { word: "FISH", emoji: "🐟" },
];

function shuffled(word: string): string[] {
  const letters = word.split("");
  const extra = "AEIOUSTRN"[Math.floor(Math.random() * 9)];
  const pool = [...letters, extra];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

/** Tap letters in order to spell the picture. Wrong letter shakes, no penalty. */
export function WordBuilder({ game }: { game: Game }) {
  const [phase, setPhase] = useState<GamePhase>("intro");
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [pool, setPool] = useState<string[]>([]);
  const [used, setUsed] = useState<number[]>([]);
  const [typed, setTyped] = useState("");
  const [shake, setShake] = useState<number | null>(null);

  const current = WORDS[(round - 1) % WORDS.length];

  function deal(nextRound: number) {
    const w = WORDS[(nextRound - 1) % WORDS.length];
    setPool(shuffled(w.word));
    setUsed([]);
    setTyped("");
  }

  function start() {
    setRound(1);
    setScore(0);
    deal(1);
    setPhase("playing");
  }

  function tap(letter: string, index: number) {
    if (used.includes(index)) return;
    const expected = current.word[typed.length];
    if (letter === expected) {
      const nextTyped = typed + letter;
      setTyped(nextTyped);
      setUsed((u) => [...u, index]);
      if (nextTyped === current.word) {
        setScore((s) => s + 1);
        setTimeout(() => {
          if (round >= WORDS.length) setPhase("won");
          else {
            setRound((r) => r + 1);
            deal(round + 1);
          }
        }, 700);
      }
    } else {
      setShake(index);
      setTimeout(() => setShake(null), 400);
    }
  }

  return (
    <GameFrame
      game={game}
      rounds={WORDS.length}
      score={score}
      round={round}
      phase={phase}
      onStart={start}
      onRestart={start}
    >
      <div className="space-y-6 text-center">
        <span className="block text-7xl" aria-hidden>
          {current.emoji}
        </span>

        <div className="flex justify-center gap-2">
          {current.word.split("").map((letter, i) => (
            <span
              key={i}
              className={cn(
                "grid h-14 w-12 place-items-center rounded-xl border-2 font-[family-name:var(--font-baloo)] text-2xl font-extrabold",
                typed.length > i ? "border-ck-green bg-ck-green/15 text-ck-navy" : "border-dashed border-ck-navy/25",
              )}
            >
              {typed[i] ?? ""}
            </span>
          ))}
        </div>

        <div className="flex flex-wrap justify-center gap-2.5">
          {pool.map((letter, i) => (
            <button
              key={`${letter}-${i}`}
              type="button"
              onClick={() => tap(letter, i)}
              disabled={used.includes(i)}
              className={cn(
                "grid h-14 w-14 place-items-center rounded-2xl border-2 font-[family-name:var(--font-baloo)] text-2xl font-extrabold transition active:scale-95",
                used.includes(i)
                  ? "border-transparent bg-muted text-muted-foreground opacity-40"
                  : "border-ck-blue/40 bg-ck-sky text-ck-navy hover:border-ck-blue",
                shake === i && "animate-wiggle border-ck-red",
              )}
            >
              {letter}
            </button>
          ))}
        </div>

        <Button variant="outline" onClick={() => deal(round)}>
          Start this word again
        </Button>
      </div>
    </GameFrame>
  );
}
