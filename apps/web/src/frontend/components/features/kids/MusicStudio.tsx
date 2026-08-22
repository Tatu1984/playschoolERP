"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Music, Play, Square, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Pad {
  note: string;
  freq: number;
  label: string;
  color: string;
}

/** A pentatonic-ish C major scale: any combination sounds pleasant. */
const PADS: Pad[] = [
  { note: "C", freq: 261.63, label: "🔴", color: "bg-ck-red" },
  { note: "D", freq: 293.66, label: "🟠", color: "bg-ck-orange" },
  { note: "E", freq: 329.63, label: "🟡", color: "bg-yellow-400" },
  { note: "F", freq: 349.23, label: "🟢", color: "bg-ck-green" },
  { note: "G", freq: 392.0, label: "🔵", color: "bg-ck-blue" },
  { note: "A", freq: 440.0, label: "🟣", color: "bg-ck-magenta" },
  { note: "B", freq: 493.88, label: "⚪", color: "bg-slate-300" },
  { note: "C2", freq: 523.25, label: "🟤", color: "bg-amber-700" },
];

const RHYMES: { name: string; notes: string[] }[] = [
  { name: "Twinkle Twinkle", notes: ["C", "C", "G", "G", "A", "A", "G"] },
  { name: "Mary Had a Little Lamb", notes: ["E", "D", "C", "D", "E", "E", "E"] },
  { name: "Happy Birthday", notes: ["C", "C", "D", "C", "F", "E"] },
];

/** Web Audio tone pads, a recorder and three rhymes to play back. */
export function MusicStudio() {
  const audioRef = useRef<AudioContext | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [tape, setTape] = useState<string[]>([]);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    return () => {
      audioRef.current?.close();
    };
  }, []);

  function play(pad: Pad) {
    if (typeof window === "undefined") return;
    type WithLegacy = Window & { webkitAudioContext?: typeof AudioContext };
    const Ctor = window.AudioContext ?? (window as WithLegacy).webkitAudioContext;
    if (!Ctor) {
      toast.info("Sound isn't supported on this device");
      return;
    }
    audioRef.current ??= new Ctor();
    const ctx = audioRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = pad.freq;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.55);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);

    setActive(pad.note);
    setTimeout(() => setActive(null), 220);
    if (recording) setTape((t) => [...t, pad.note]);
  }

  async function playSequence(notes: string[]) {
    setPlaying(true);
    for (const note of notes) {
      const pad = PADS.find((p) => p.note === note);
      if (pad) play(pad);
      await new Promise((r) => setTimeout(r, 420));
    }
    setPlaying(false);
  }

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h1 className="font-[family-name:var(--font-baloo)] text-2xl font-extrabold text-ck-navy">Music studio</h1>
        <p className="text-sm font-semibold text-ck-navy/75">Tap the pads to make a tune</p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {PADS.map((pad) => (
          <button
            key={pad.note}
            type="button"
            onPointerDown={() => play(pad)}
            aria-label={`Note ${pad.note}`}
            className={cn(
              "grid aspect-square place-items-center rounded-3xl text-3xl text-white shadow-md transition active:scale-90",
              pad.color,
              active === pad.note && "scale-95 ring-4 ring-white",
            )}
          >
            <span className="font-[family-name:var(--font-baloo)] font-extrabold">{pad.note}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button
          size="lg"
          variant={recording ? "destructive" : "default"}
          className="h-12 font-extrabold"
          onClick={() => {
            if (recording) {
              setRecording(false);
              toast.success(`Recorded ${tape.length} notes!`);
            } else {
              setTape([]);
              setRecording(true);
            }
          }}
        >
          {recording ? <Square /> : <Music />}
          {recording ? "Stop recording" : "Record my tune"}
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="h-12 font-extrabold"
          disabled={tape.length === 0 || playing}
          onClick={() => playSequence(tape)}
        >
          <Play /> Play it back
        </Button>
        {tape.length > 0 && (
          <Button size="lg" variant="ghost" className="h-12" onClick={() => setTape([])} aria-label="Clear recording">
            <Trash2 />
          </Button>
        )}
      </div>

      {tape.length > 0 && (
        <div className="rounded-2xl border bg-card p-3 text-center">
          <p className="mb-1 font-[family-name:var(--font-baloo)] text-sm font-extrabold text-ck-navy/75">
            Your tune ({tape.length} notes)
          </p>
          <p className="font-mono text-sm break-words">{tape.join(" · ")}</p>
        </div>
      )}

      <section>
        <h2 className="mb-2 font-[family-name:var(--font-baloo)] text-lg font-extrabold text-ck-navy">
          Play along with a rhyme
        </h2>
        <div className="grid gap-2 sm:grid-cols-3">
          {RHYMES.map((r) => (
            <button
              key={r.name}
              type="button"
              disabled={playing}
              onClick={() => playSequence(r.notes)}
              className="flex items-center gap-3 rounded-2xl border bg-card p-3 text-left transition hover:border-ck-blue disabled:opacity-50"
            >
              <span className="text-2xl" aria-hidden>
                🎵
              </span>
              <span className="min-w-0">
                <span className="block truncate font-[family-name:var(--font-baloo)] text-sm font-extrabold text-ck-navy">
                  {r.name}
                </span>
                <span className="block text-[10px] text-muted-foreground">{r.notes.length} notes</span>
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
