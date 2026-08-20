"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Game } from "@/shared/types/learning.types";
import { GameFrame, type GamePhase } from "../GameFrame";

const LETTERS = ["A", "C", "L", "O", "S", "T"];
const ROUNDS = LETTERS.length;

/**
 * Finger/mouse tracing over a big letter. We score coverage: how much of the
 * letter's bounding area the child's strokes touched. Forgiving on purpose.
 */
export function LetterTrace({ game }: { game: Game }) {
  const [phase, setPhase] = useState<GamePhase>("intro");
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [coverage, setCoverage] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const touched = useRef<Set<string>>(new Set());

  const letter = LETTERS[(round - 1) % LETTERS.length];

  function reset() {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
    touched.current = new Set();
    setCoverage(0);
  }

  function start() {
    setRound(1);
    setScore(0);
    setPhase("playing");
    setTimeout(reset, 0);
  }

  function pointFrom(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function draw(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const { x, y } = pointFrom(e);

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#DC2638";
    ctx.lineWidth = 22;
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);

    // 12×12 coverage grid over the canvas.
    const cell = `${Math.floor((x / canvas.width) * 12)}:${Math.floor((y / canvas.height) * 12)}`;
    touched.current.add(cell);
    setCoverage(Math.min(100, Math.round((touched.current.size / 40) * 100)));
  }

  function finishRound() {
    const passed = coverage >= 55;
    if (passed) setScore((s) => s + 1);
    if (round >= ROUNDS) {
      setPhase("won");
    } else {
      setRound((r) => r + 1);
      reset();
    }
  }

  return (
    <GameFrame game={game} rounds={ROUNDS} score={score} round={round} phase={phase} onStart={start} onRestart={start}>
      <div className="space-y-4 text-center">
        <p className="font-[family-name:var(--font-baloo)] text-lg font-extrabold text-ck-navy">
          Trace the letter <span className="text-ck-red">{letter}</span> with your finger
        </p>

        <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-3xl border-4 border-dashed border-ck-blue/40 bg-ck-sky">
          <span
            className="pointer-events-none absolute inset-0 grid place-items-center font-[family-name:var(--font-baloo)] text-[14rem] leading-none font-extrabold text-ck-navy/15 select-none"
            aria-hidden
          >
            {letter}
          </span>
          <canvas
            ref={canvasRef}
            width={480}
            height={480}
            className="relative h-full w-full touch-none"
            aria-label={`Tracing area for the letter ${letter}`}
            onPointerDown={(e) => {
              drawing.current = true;
              const ctx = canvasRef.current?.getContext("2d");
              const { x, y } = pointFrom(e);
              ctx?.beginPath();
              ctx?.moveTo(x, y);
            }}
            onPointerMove={draw}
            onPointerUp={() => {
              drawing.current = false;
            }}
            onPointerLeave={() => {
              drawing.current = false;
            }}
          />
        </div>

        <div className="mx-auto max-w-sm">
          <div className="h-3 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-ck-green to-ck-blue transition-all"
              style={{ width: `${coverage}%` }}
            />
          </div>
          <p className="mt-1 text-xs font-bold text-muted-foreground">
            {coverage >= 55 ? "Great tracing! Tap Next." : `Keep going — ${coverage}% traced`}
          </p>
        </div>

        <div className="flex justify-center gap-2">
          <Button variant="outline" onClick={reset}>
            Clear
          </Button>
          <Button onClick={finishRound} disabled={coverage < 20} className="font-extrabold">
            {round >= ROUNDS ? "Finish" : "Next letter"}
          </Button>
        </div>
      </div>
    </GameFrame>
  );
}
