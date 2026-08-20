"use client";

import { useState } from "react";
import { useKidsProfile } from "@/frontend/hooks/useKidsProfile";
import { MASCOTS, nudgeFor } from "../mascots";
import type { Game } from "@/shared/types/learning.types";
import { GameFrame, type GamePhase } from "../GameFrame";
import { cn } from "@/lib/utils";

export interface Question {
  /** Big prompt above the options. */
  prompt: string;
  /** Optional emoji/visual shown with the prompt (e.g. 🍎🍎🍎). */
  visual?: string;
  options: { key: string; label: string; correct: boolean }[];
  /** Rendered as large squares instead of wide buttons. */
  tile?: boolean;
}

/**
 * One engine, five games: animal sounds, counting, patterns, math and quiz all
 * reduce to "read the prompt, tap the right option".
 */
export function ChoiceGame({
  game,
  makeQuestions,
  rounds = 8,
}: {
  game: Game;
  makeQuestions: () => Question[];
  rounds?: number;
}) {
  const { journey } = useKidsProfile();
  const mascot = MASCOTS[journey.mascot];

  const [phase, setPhase] = useState<GamePhase>("intro");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  function start() {
    setQuestions(makeQuestions().slice(0, rounds));
    setIndex(0);
    setScore(0);
    setPicked(null);
    setFeedback(null);
    setPhase("playing");
  }

  const current = questions[index];

  function choose(key: string) {
    if (picked || !current) return;
    setPicked(key);
    const option = current.options.find((o) => o.key === key);
    const right = !!option?.correct;
    if (right) {
      setScore((s) => s + 1);
      setFeedback("✨ Yes!");
    } else {
      setFeedback(nudgeFor(mascot, index));
    }
    setTimeout(() => {
      setPicked(null);
      setFeedback(null);
      if (index + 1 >= questions.length) setPhase("won");
      else setIndex((i) => i + 1);
    }, 850);
  }

  return (
    <GameFrame
      game={game}
      rounds={Math.min(rounds, questions.length || rounds)}
      score={score}
      round={index + 1}
      phase={phase}
      onStart={start}
      onRestart={start}
    >
      {current && (
        <div className="space-y-5 text-center">
          <p className="font-[family-name:var(--font-baloo)] text-xl font-extrabold text-ck-navy sm:text-2xl">
            {current.prompt}
          </p>
          {current.visual && (
            <p className="text-4xl leading-relaxed tracking-widest sm:text-5xl" aria-hidden>
              {current.visual}
            </p>
          )}

          <div
            className={cn(
              "mx-auto grid max-w-lg gap-3",
              current.tile ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-1 sm:grid-cols-2",
            )}
          >
            {current.options.map((o) => {
              const isPicked = picked === o.key;
              const reveal = picked !== null;
              return (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => choose(o.key)}
                  disabled={reveal}
                  className={cn(
                    "rounded-2xl border-2 font-[family-name:var(--font-baloo)] font-extrabold transition active:scale-95",
                    current.tile ? "aspect-square text-4xl" : "min-h-[56px] px-4 py-3 text-lg",
                    reveal && o.correct && "border-ck-green bg-ck-green/20",
                    reveal && isPicked && !o.correct && "border-ck-red bg-ck-red/15",
                    !reveal && "border-ck-blue/30 bg-ck-sky hover:border-ck-blue hover:bg-ck-blue/10",
                  )}
                >
                  {o.label}
                </button>
              );
            })}
          </div>

          <p className="min-h-6 font-[family-name:var(--font-baloo)] text-lg font-extrabold text-ck-navy/70">
            {feedback ?? ""}
          </p>
        </div>
      )}
    </GameFrame>
  );
}

// --------------------------------------------------------------- generators

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const ANIMALS = [
  { emoji: "🐮", name: "cow", sound: "Moooo" },
  { emoji: "🐶", name: "dog", sound: "Woof woof" },
  { emoji: "🐱", name: "cat", sound: "Meow" },
  { emoji: "🐸", name: "frog", sound: "Ribbit" },
  { emoji: "🐔", name: "hen", sound: "Cluck cluck" },
  { emoji: "🦁", name: "lion", sound: "Roooar" },
  { emoji: "🐑", name: "sheep", sound: "Baaaa" },
  { emoji: "🐝", name: "bee", sound: "Bzzzz" },
];

export function animalSoundQuestions(): Question[] {
  return shuffle(ANIMALS).map((animal) => {
    const others = shuffle(ANIMALS.filter((a) => a.name !== animal.name)).slice(0, 3);
    return {
      prompt: `Who says “${animal.sound}”?`,
      tile: true,
      options: shuffle([
        { key: animal.name, label: animal.emoji, correct: true },
        ...others.map((o) => ({ key: o.name, label: o.emoji, correct: false })),
      ]),
    };
  });
}

const FRUITS = ["🍎", "🍌", "🍇", "🍓", "🍊", "🥕"];

export function countingQuestions(): Question[] {
  return Array.from({ length: 8 }, (_, i) => {
    const count = 1 + ((i * 3 + 2) % 9);
    const fruit = FRUITS[i % FRUITS.length];
    const wrongs = shuffle([count - 1, count + 1, count + 2, count - 2].filter((n) => n > 0 && n !== count)).slice(0, 3);
    return {
      prompt: "How many do you see?",
      visual: fruit.repeat(count),
      options: shuffle([
        { key: `${count}`, label: `${count}`, correct: true },
        ...wrongs.map((w) => ({ key: `${w}`, label: `${w}`, correct: false })),
      ]),
      tile: true,
    };
  });
}

const PATTERNS: { seq: string[]; next: string; decoys: string[] }[] = [
  { seq: ["🔺", "🔵", "🔺", "🔵"], next: "🔺", decoys: ["🔵", "🟩", "⭐"] },
  { seq: ["🍎", "🍎", "🍌", "🍎", "🍎"], next: "🍌", decoys: ["🍎", "🍇", "🍓"] },
  { seq: ["⭐", "🌙", "⭐", "🌙"], next: "⭐", decoys: ["🌙", "☀️", "☁️"] },
  { seq: ["🟥", "🟨", "🟦", "🟥", "🟨"], next: "🟦", decoys: ["🟥", "🟨", "🟩"] },
  { seq: ["🐶", "🐱", "🐶", "🐱"], next: "🐶", decoys: ["🐱", "🐭", "🐰"] },
  { seq: ["1️⃣", "2️⃣", "3️⃣", "4️⃣"], next: "5️⃣", decoys: ["6️⃣", "3️⃣", "9️⃣"] },
];

export function patternQuestions(): Question[] {
  return shuffle(PATTERNS).map((p) => ({
    prompt: "What comes next?",
    visual: `${p.seq.join(" ")} ❓`,
    tile: true,
    options: shuffle([
      { key: "right", label: p.next, correct: true },
      ...p.decoys.slice(0, 3).map((d, i) => ({ key: `d${i}`, label: d, correct: false })),
    ]),
  }));
}

export function mathQuestions(): Question[] {
  return Array.from({ length: 8 }, (_, i) => {
    const a = 1 + ((i * 2 + 1) % 9);
    const b = 1 + ((i * 3 + 2) % 9);
    const plus = i % 3 !== 2;
    const answer = plus ? a + b : Math.max(a, b) - Math.min(a, b);
    const wrongs = shuffle([answer + 1, answer - 1, answer + 2].filter((n) => n >= 0 && n !== answer)).slice(0, 3);
    return {
      prompt: plus ? `${a} + ${b} = ?` : `${Math.max(a, b)} − ${Math.min(a, b)} = ?`,
      visual: plus ? `${"🟡".repeat(a)} + ${"🔵".repeat(b)}` : undefined,
      tile: true,
      options: shuffle([
        { key: `${answer}`, label: `${answer}`, correct: true },
        ...wrongs.map((w) => ({ key: `${w}`, label: `${w}`, correct: false })),
      ]),
    };
  });
}

const SCIENCE: { q: string; right: string; wrong: string[] }[] = [
  { q: "Does a stone sink or float?", right: "Sinks 🪨", wrong: ["Floats 🎈"] },
  { q: "Does a leaf sink or float?", right: "Floats 🍃", wrong: ["Sinks 🪨"] },
  { q: "When do we see the moon?", right: "Night 🌙", wrong: ["Morning ☀️", "Lunch time 🍽️"] },
  { q: "What do plants need to grow?", right: "Water 💧", wrong: ["Sand ⏳", "Rocks 🪨"] },
  { q: "Which one is a mammal?", right: "Dog 🐶", wrong: ["Fish 🐟", "Snake 🐍"] },
  { q: "Ice is water that is…", right: "Very cold 🧊", wrong: ["Very hot 🔥", "Very loud 📢"] },
  { q: "How many legs does a spider have?", right: "Eight 🕷️", wrong: ["Four 🐕", "Six 🐜"] },
  { q: "Which season brings rain in Kolkata?", right: "Monsoon 🌧️", wrong: ["Winter ❄️", "Summer 🏖️"] },
];

export function scienceQuestions(): Question[] {
  return shuffle(SCIENCE).map((s) => ({
    prompt: s.q,
    options: shuffle([
      { key: "right", label: s.right, correct: true },
      ...s.wrong.map((w, i) => ({ key: `w${i}`, label: w, correct: false })),
    ]),
  }));
}
