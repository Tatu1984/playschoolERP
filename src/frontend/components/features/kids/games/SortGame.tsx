"use client";

import { useState } from "react";
import type { Game } from "@/shared/types/learning.types";
import { GameFrame, type GamePhase } from "../GameFrame";
import { cn } from "@/lib/utils";

interface Piece {
  id: string;
  label: string;
  bucket: string;
  placed: boolean;
}

interface Bucket {
  key: string;
  label: string;
  emoji: string;
}

/**
 * Tap-a-piece then tap-a-bucket. Deliberately not HTML5 drag-and-drop: tapping
 * works identically on a toddler's finger and a mouse.
 */
export function SortGame({
  game,
  buckets,
  pieces,
  prompt,
}: {
  game: Game;
  buckets: Bucket[];
  pieces: Omit<Piece, "placed">[];
  prompt: string;
}) {
  const [phase, setPhase] = useState<GamePhase>("intro");
  const [items, setItems] = useState<Piece[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [shake, setShake] = useState<string | null>(null);

  function start() {
    setItems(pieces.map((p) => ({ ...p, placed: false })));
    setSelected(null);
    setScore(0);
    setPhase("playing");
  }

  function dropInto(bucketKey: string) {
    if (!selected) return;
    const piece = items.find((i) => i.id === selected);
    if (!piece) return;
    if (piece.bucket === bucketKey) {
      const next = items.map((i) => (i.id === piece.id ? { ...i, placed: true } : i));
      setItems(next);
      setScore((s) => s + 1);
      setSelected(null);
      if (next.every((i) => i.placed)) setTimeout(() => setPhase("won"), 400);
    } else {
      setShake(bucketKey);
      setTimeout(() => setShake(null), 400);
    }
  }

  const remaining = items.filter((i) => !i.placed);

  return (
    <GameFrame
      game={game}
      rounds={pieces.length}
      score={score}
      round={Math.min(pieces.length, score + 1)}
      phase={phase}
      onStart={start}
      onRestart={start}
    >
      <div className="space-y-6 text-center">
        <p className="font-[family-name:var(--font-baloo)] text-lg font-extrabold text-ck-navy sm:text-xl">
          {selected ? "Now tap where it goes!" : prompt}
        </p>

        {/* pieces */}
        <div className="flex min-h-24 flex-wrap items-center justify-center gap-3">
          {remaining.map((piece) => (
            <button
              key={piece.id}
              type="button"
              onClick={() => setSelected(piece.id === selected ? null : piece.id)}
              className={cn(
                "grid h-20 w-20 place-items-center rounded-2xl border-2 text-4xl transition active:scale-95",
                selected === piece.id
                  ? "-translate-y-1 scale-110 border-ck-red bg-ck-red/10 shadow-lg"
                  : "border-border bg-card hover:border-ck-blue",
              )}
              aria-label={piece.label}
            >
              <span aria-hidden>{piece.label}</span>
            </button>
          ))}
          {remaining.length === 0 && (
            <p className="font-[family-name:var(--font-baloo)] text-lg font-extrabold text-ck-green">All done! 🎉</p>
          )}
        </div>

        {/* buckets */}
        <div className="grid gap-3 sm:grid-cols-3">
          {buckets.map((b) => {
            const placed = items.filter((i) => i.placed && i.bucket === b.key);
            return (
              <button
                key={b.key}
                type="button"
                onClick={() => dropInto(b.key)}
                disabled={!selected}
                className={cn(
                  "flex min-h-28 flex-col items-center justify-center gap-1 rounded-3xl border-4 border-dashed p-3 transition",
                  shake === b.key && "animate-wiggle border-ck-red",
                  selected ? "border-ck-blue/60 bg-ck-sky hover:bg-ck-blue/15" : "border-border bg-muted/40",
                )}
              >
                <span className="text-3xl" aria-hidden>
                  {b.emoji}
                </span>
                <span className="font-[family-name:var(--font-baloo)] text-sm font-extrabold text-ck-navy">
                  {b.label}
                </span>
                {placed.length > 0 && (
                  <span className="text-xl" aria-hidden>
                    {placed.map((p) => p.label).join("")}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </GameFrame>
  );
}

// --------------------------------------------------------------- presets

export const SHAPE_BUCKETS: Bucket[] = [
  { key: "circle", label: "Circles", emoji: "⭕" },
  { key: "square", label: "Squares", emoji: "🟦" },
  { key: "triangle", label: "Triangles", emoji: "🔺" },
];

export const SHAPE_PIECES: Omit<Piece, "placed">[] = [
  { id: "s1", label: "🔵", bucket: "circle" },
  { id: "s2", label: "🟥", bucket: "square" },
  { id: "s3", label: "🔺", bucket: "triangle" },
  { id: "s4", label: "🟡", bucket: "circle" },
  { id: "s5", label: "🟩", bucket: "square" },
  { id: "s6", label: "⚠️", bucket: "triangle" },
];

export const COLOR_BUCKETS: Bucket[] = [
  { key: "red", label: "Red basket", emoji: "🧺" },
  { key: "blue", label: "Blue basket", emoji: "🧺" },
  { key: "yellow", label: "Yellow basket", emoji: "🧺" },
];

export const COLOR_PIECES: Omit<Piece, "placed">[] = [
  { id: "c1", label: "🍎", bucket: "red" },
  { id: "c2", label: "🫐", bucket: "blue" },
  { id: "c3", label: "🍋", bucket: "yellow" },
  { id: "c4", label: "🍓", bucket: "red" },
  { id: "c5", label: "💙", bucket: "blue" },
  { id: "c6", label: "🌻", bucket: "yellow" },
];
