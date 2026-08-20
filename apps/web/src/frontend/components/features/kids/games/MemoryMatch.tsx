"use client";

import { useState } from "react";
import type { Game } from "@/shared/types/learning.types";
import { GameFrame, type GamePhase } from "../GameFrame";
import { cn } from "@/lib/utils";

const FACES = ["🐶", "🐱", "🐰", "🦊", "🐼", "🐸"];

interface Card {
  id: number;
  face: string;
  flipped: boolean;
  matched: boolean;
}

function deal(): Card[] {
  const deck = [...FACES, ...FACES].map((face, i) => ({ id: i, face, flipped: false, matched: false }));
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck.map((c, i) => ({ ...c, id: i }));
}

/** Classic pairs. Score = pairs found, so three stars needs a clean sweep. */
export function MemoryMatch({ game }: { game: Game }) {
  const [phase, setPhase] = useState<GamePhase>("intro");
  const [cards, setCards] = useState<Card[]>([]);
  const [open, setOpen] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [busy, setBusy] = useState(false);

  function start() {
    setCards(deal());
    setOpen([]);
    setScore(0);
    setBusy(false);
    setPhase("playing");
  }

  function flip(card: Card) {
    if (busy || card.flipped || card.matched) return;
    const nextOpen = [...open, card.id];
    setCards((cs) => cs.map((c) => (c.id === card.id ? { ...c, flipped: true } : c)));

    if (nextOpen.length === 2) {
      setBusy(true);
      const [a, b] = nextOpen;
      const cardA = cards.find((c) => c.id === a);
      const cardB = card;
      setTimeout(() => {
        if (cardA && cardA.face === cardB.face) {
          setCards((cs) => cs.map((c) => (c.id === a || c.id === b ? { ...c, matched: true, flipped: true } : c)));
          setScore((s) => {
            const next = s + 1;
            if (next === FACES.length) setTimeout(() => setPhase("won"), 500);
            return next;
          });
        } else {
          setCards((cs) => cs.map((c) => (c.id === a || c.id === b ? { ...c, flipped: false } : c)));
        }
        setOpen([]);
        setBusy(false);
      }, 700);
      setOpen(nextOpen);
    } else {
      setOpen(nextOpen);
    }
  }

  return (
    <GameFrame
      game={game}
      rounds={FACES.length}
      score={score}
      round={Math.min(FACES.length, score + 1)}
      phase={phase}
      onStart={start}
      onRestart={start}
    >
      <div className="space-y-4 text-center">
        <p className="font-[family-name:var(--font-baloo)] text-lg font-extrabold text-ck-navy">
          Find the matching pairs!
        </p>
        <div className="mx-auto grid max-w-md grid-cols-4 gap-2.5 sm:gap-3">
          {cards.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => flip(card)}
              aria-label={card.flipped || card.matched ? card.face : "Hidden card"}
              className={cn(
                "grid aspect-square place-items-center rounded-2xl border-2 text-3xl transition active:scale-95 sm:text-4xl",
                card.matched
                  ? "border-ck-green bg-ck-green/15"
                  : card.flipped
                    ? "border-ck-blue bg-ck-sky"
                    : "border-ck-navy/20 bg-ck-navy/90 text-white hover:bg-ck-navy",
              )}
            >
              <span aria-hidden>{card.flipped || card.matched ? card.face : "❓"}</span>
            </button>
          ))}
        </div>
      </div>
    </GameFrame>
  );
}
