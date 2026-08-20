"use client";

import { useState } from "react";
import type { Game } from "@/shared/types/learning.types";
import { GameFrame, type GamePhase } from "../GameFrame";
import { cn } from "@/lib/utils";

const COLORS = [
  { key: "red", label: "red", emoji: "🎈", className: "bg-ck-red" },
  { key: "blue", label: "blue", emoji: "🎈", className: "bg-ck-blue" },
  { key: "green", label: "green", emoji: "🎈", className: "bg-ck-green" },
  { key: "yellow", label: "yellow", emoji: "🎈", className: "bg-ck-orange" },
  { key: "pink", label: "pink", emoji: "🎈", className: "bg-ck-magenta" },
];

interface Balloon {
  id: number;
  color: string;
  popped: boolean;
}

const ROUNDS = 10;
const PER_ROUND = 6;

/** Module scope keeps the randomness out of the component's render path. */
function dealRound(nextRound: number): { target: (typeof COLORS)[number]; balloons: Balloon[] } {
  const target = COLORS[Math.floor(Math.random() * COLORS.length)];
  const balloons: Balloon[] = Array.from({ length: PER_ROUND }, (_, i) => ({
    id: nextRound * 100 + i,
    color: COLORS[Math.floor(Math.random() * COLORS.length)].key,
    popped: false,
  }));
  // Guarantee at least one correct balloon.
  balloons[Math.floor(Math.random() * PER_ROUND)].color = target.key;
  return { target, balloons };
}

/** Tap the balloon whose colour matches the prompt. Motor + colour naming. */
export function BalloonPop({ game }: { game: Game }) {
  const [phase, setPhase] = useState<GamePhase>("intro");
  const [balloons, setBalloons] = useState<Balloon[]>([]);
  const [target, setTarget] = useState(COLORS[0]);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [wobble, setWobble] = useState<number | null>(null);

  function deal(nextRound: number) {
    const dealt = dealRound(nextRound);
    setTarget(dealt.target);
    setBalloons(dealt.balloons);
  }

  function start() {
    setScore(0);
    setRound(1);
    deal(1);
    setPhase("playing");
  }

  function pop(balloon: Balloon) {
    if (balloon.popped) return;
    if (balloon.color === target.key) {
      setBalloons((bs) => bs.map((b) => (b.id === balloon.id ? { ...b, popped: true } : b)));
      setScore((s) => s + 1);
      setTimeout(() => {
        if (round >= ROUNDS) setPhase("won");
        else {
          setRound((r) => r + 1);
          deal(round + 1);
        }
      }, 380);
    } else {
      setWobble(balloon.id);
      setTimeout(() => setWobble(null), 420);
    }
  }

  const targetColor = COLORS.find((c) => c.key === target.key)!;

  return (
    <GameFrame
      game={game}
      rounds={ROUNDS}
      score={score}
      round={round}
      phase={phase}
      onStart={start}
      onRestart={start}
    >
      <div className="space-y-5 text-center">
        <p className="font-[family-name:var(--font-baloo)] text-xl font-extrabold text-ck-navy sm:text-2xl">
          Pop the{" "}
          <span className={cn("rounded-lg px-2 py-0.5 text-white", targetColor.className)}>{targetColor.label}</span>{" "}
          balloon!
        </p>

        <div className="mx-auto grid max-w-lg grid-cols-3 gap-4">
          {balloons.map((b) => {
            const color = COLORS.find((c) => c.key === b.color)!;
            return (
              <button
                key={b.id}
                type="button"
                aria-label={`${color.label} balloon`}
                onClick={() => pop(b)}
                disabled={b.popped}
                className={cn(
                  "grid aspect-square place-items-center rounded-full text-4xl shadow-inner transition sm:text-5xl",
                  color.className,
                  b.popped && "scale-0 opacity-0",
                  wobble === b.id && "animate-wiggle",
                  !b.popped && "hover:scale-105 active:scale-95",
                )}
              >
                <span aria-hidden>{b.popped ? "" : "🎈"}</span>
              </button>
            );
          })}
        </div>
      </div>
    </GameFrame>
  );
}
