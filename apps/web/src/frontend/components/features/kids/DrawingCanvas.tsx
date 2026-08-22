"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Download, Eraser, Save, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useErpStore } from "@/frontend/store/erpStore";
import { useKidsProfile } from "@/frontend/hooks/useKidsProfile";
import { formatDate } from "@/frontend/utils/formatters";
import { cn } from "@/lib/utils";

const COLORS = ["#DC2638", "#F39A1E", "#2BAEEC", "#8BC53F", "#D4318F", "#1A1F4B", "#FFFFFF"];
const SIZES = [6, 14, 26];
const STAMPS = ["⭐", "❤️", "🌈", "🐶", "🌸", "🚀"];

/** Finger painting with a colour palette, stamps and a saved gallery. */
export function DrawingCanvas() {
  const { child } = useKidsProfile();
  const artworks = useErpStore((s) => s.artworks);
  const saveArtwork = useErpStore((s) => s.saveArtwork);
  const removeItem = useErpStore((s) => s.removeItem);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(SIZES[1]);
  const [stamp, setStamp] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const mine = artworks.filter((a) => a.studentId === child?.id);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.fillStyle = "#FFFDF8";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  function pointFrom(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function stampAt(e: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !stamp) return;
    const { x, y } = pointFrom(e);
    ctx.font = "64px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(stamp, x, y);
    setDirty(true);
  }

  function draw(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || stamp) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = pointFrom(e);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
    setDirty(true);
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.fillStyle = "#FFFDF8";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setDirty(false);
  }

  function save() {
    const canvas = canvasRef.current;
    if (!canvas || !child) return;
    const dataUrl = canvas.toDataURL("image/png");
    saveArtwork(child.id, `${child.firstName}'s drawing`, dataUrl);
    toast.success("Saved to your gallery! ⭐");
    setDirty(false);
  }

  function download() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "my-drawing.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h1 className="font-[family-name:var(--font-baloo)] text-2xl font-extrabold text-ck-navy">Draw &amp; paint</h1>
        <p className="text-sm font-semibold text-ck-navy/75">Pick a colour and use your finger</p>
      </div>

      {/* palette */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => {
              setColor(c);
              setStamp(null);
            }}
            aria-label={`Colour ${c}`}
            className={cn(
              "h-10 w-10 rounded-full border-4 transition active:scale-90",
              color === c && !stamp ? "scale-110 border-ck-navy" : "border-white",
            )}
            style={{ background: c }}
          />
        ))}
        <span className="mx-1 h-8 w-px bg-border" />
        {SIZES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSize(s)}
            aria-label={`Brush size ${s}`}
            className={cn(
              "grid h-10 w-10 place-items-center rounded-full border-2 transition",
              size === s ? "border-ck-navy bg-muted" : "border-transparent hover:bg-muted",
            )}
          >
            <span className="rounded-full bg-ck-navy" style={{ width: s, height: s }} />
          </button>
        ))}
      </div>

      {/* stamps */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <span className="font-[family-name:var(--font-baloo)] text-xs font-extrabold text-ck-navy/75">Stamps</span>
        {STAMPS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStamp(stamp === s ? null : s)}
            className={cn(
              "grid h-10 w-10 place-items-center rounded-xl border-2 text-xl transition active:scale-90",
              stamp === s ? "border-ck-red bg-ck-red/10" : "border-border hover:bg-muted",
            )}
            aria-label={`Stamp ${s}`}
          >
            <span aria-hidden>{s}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            setStamp(null);
            setColor("#FFFDF8");
          }}
          className="grid h-10 w-10 place-items-center rounded-xl border-2 border-border transition hover:bg-muted"
          aria-label="Eraser"
        >
          <Eraser className="h-4 w-4" />
        </button>
      </div>

      <canvas
        ref={canvasRef}
        width={720}
        height={520}
        className="aspect-[9/6.5] w-full touch-none rounded-3xl border-4 border-white bg-[#FFFDF8] shadow-inner"
        aria-label="Drawing canvas"
        onPointerDown={(e) => {
          if (stamp) {
            stampAt(e);
            return;
          }
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

      <div className="flex flex-wrap justify-center gap-2">
        <Button size="lg" className="h-12 font-extrabold" onClick={save} disabled={!dirty}>
          <Save /> Save my drawing
        </Button>
        <Button size="lg" variant="outline" className="h-12 font-extrabold" onClick={download}>
          <Download /> Download
        </Button>
        <Button size="lg" variant="outline" className="h-12 font-extrabold" onClick={clear}>
          <Trash2 /> Start again
        </Button>
      </div>

      {mine.length > 0 && (
        <section>
          <h2 className="mb-2 flex items-center gap-1.5 font-[family-name:var(--font-baloo)] text-lg font-extrabold text-ck-navy">
            <Sparkles className="h-4 w-4 text-ck-orange" /> My gallery ({mine.length})
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {mine.map((art) => (
              <figure key={art.id} className="overflow-hidden rounded-2xl border bg-card">
                {/* eslint-disable-next-line @next/next/no-img-element -- data-URL canvas export */}
                <img src={art.dataUrl} alt={art.title} className="aspect-[9/6.5] w-full object-cover" />
                <figcaption className="flex items-center justify-between gap-2 p-2">
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-bold">{art.title}</span>
                    <span className="block text-[10px] text-muted-foreground">{formatDate(art.createdAt)}</span>
                  </span>
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    aria-label="Delete drawing"
                    onClick={() => {
                      removeItem("artworks", art.id);
                      toast.success("Drawing removed");
                    }}
                  >
                    <Trash2 />
                  </Button>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
