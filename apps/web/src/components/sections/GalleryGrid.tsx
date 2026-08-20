"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ImageIcon,
  Video,
  Sparkles,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type GalleryItem = {
  id: string;
  url: string;
  pathname: string;
  contentType: string;
  size: number;
  caption: string;
  category: string;
  sortOrder: number;
  uploadedAt: string;
};

type Category = { value: string; label: string };

export function GalleryGrid({
  items,
  categories,
  configured,
}: {
  items: GalleryItem[];
  categories: Category[];
  configured: boolean;
}) {
  const [filter, setFilter] = useState<string>("all");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [slideDir, setSlideDir] = useState<1 | -1>(1);
  const visible = useMemo(
    () => (filter === "all" ? items : items.filter((i) => i.category === filter)),
    [items, filter],
  );

  const openAt = useCallback((index: number) => {
    setSlideDir(1);
    setLightboxIndex(index);
  }, []);
  const close = useCallback(() => setLightboxIndex(null), []);
  const goNext = useCallback(() => {
    setSlideDir(1);
    setLightboxIndex((i) =>
      i === null ? null : (i + 1) % visible.length,
    );
  }, [visible.length]);
  const goPrev = useCallback(() => {
    setSlideDir(-1);
    setLightboxIndex((i) =>
      i === null ? null : (i - 1 + visible.length) % visible.length,
    );
  }, [visible.length]);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [lightboxIndex, close, goNext, goPrev]);

  if (!configured) {
    return (
      <div className="rounded-3xl border-2 border-dashed border-ck-cream bg-white/80 p-10 text-center">
        <Sparkles className="mx-auto h-10 w-10 text-ck-orange" />
        <h3 className="mt-3 font-[family-name:var(--font-fredoka)] text-2xl font-bold text-ck-navy">
          Gallery is being prepared
        </h3>
        <p className="mt-2 text-ck-navy/70 max-w-md mx-auto">
          First photos and videos will appear here very soon.
        </p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-3xl border-2 border-dashed border-ck-cream bg-white/80 p-10 text-center">
        <ImageIcon className="mx-auto h-10 w-10 text-ck-blue" />
        <h3 className="mt-3 font-[family-name:var(--font-fredoka)] text-2xl font-bold text-ck-navy">
          Gallery is warming up
        </h3>
        <p className="mt-2 text-ck-navy/70">
          First photos &amp; videos will land here soon. Check back!
        </p>
      </div>
    );
  }

  const populatedCategories = categories.filter((c) =>
    items.some((i) => i.category === c.value),
  );

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap mb-8">
        <Filter className="h-4 w-4 text-ck-navy/60" />
        <button
          onClick={() => setFilter("all")}
          className={cn(
            "rounded-full px-3.5 py-1.5 text-sm font-bold transition-colors",
            filter === "all"
              ? "bg-ck-navy text-white"
              : "bg-white text-ck-navy/75 hover:text-ck-navy",
          )}
        >
          All ({items.length})
        </button>
        {populatedCategories.map((c) => {
          const n = items.filter((i) => i.category === c.value).length;
          return (
            <button
              key={c.value}
              onClick={() => setFilter(c.value)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm font-bold transition-colors",
                filter === c.value
                  ? "bg-ck-red text-white"
                  : "bg-white text-ck-navy/75 hover:text-ck-navy",
              )}
            >
              {c.label} ({n})
            </button>
          );
        })}
      </div>

      <div className="columns-2 gap-4 sm:columns-3 lg:columns-4 [&>*]:mb-4">
        {visible.map((it, i) => {
          const isVideo = it.contentType.startsWith("video/");
          return (
            <motion.figure
              key={it.id}
              className="group relative break-inside-avoid overflow-hidden rounded-2xl shadow-[0_8px_22px_rgba(26,31,75,0.08)]"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, delay: (i % 8) * 0.04 }}
            >
              {isVideo ? (
                <video
                  src={it.url}
                  controls
                  preload="metadata"
                  className="block w-full bg-ck-navy"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => openAt(i)}
                  className="block w-full cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-ck-red"
                  aria-label={it.caption ? `Open ${it.caption}` : "Open image"}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={it.url}
                    alt={it.caption}
                    loading="lazy"
                    className="block w-full transition-transform duration-500 group-hover:scale-105"
                  />
                </button>
              )}
              <Badge
                className="absolute left-2 top-2 rounded-full bg-white/90 backdrop-blur text-ck-navy font-bold gap-1"
                variant="secondary"
              >
                {isVideo ? (
                  <Video className="h-3 w-3" />
                ) : (
                  <ImageIcon className="h-3 w-3" />
                )}
                {categories.find((c) => c.value === it.category)?.label ?? it.category}
              </Badge>
              {it.caption && (
                <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-ck-navy/85 via-ck-navy/55 to-transparent p-3 text-xs font-semibold text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  {it.caption}
                </figcaption>
              )}
            </motion.figure>
          );
        })}
      </div>

      <AnimatePresence>
        {lightboxIndex !== null && visible[lightboxIndex] && (
          <motion.div
            key="lightbox"
            className="fixed inset-0 z-[100] flex items-center justify-center bg-ck-navy/90 backdrop-blur-sm p-4 sm:p-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={close}
            role="dialog"
            aria-modal="true"
            aria-label="Image viewer"
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                close();
              }}
              className="absolute right-4 top-4 z-10 rounded-full bg-white/90 p-2 text-ck-navy shadow-lg transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            {visible.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goPrev();
                  }}
                  className="absolute left-2 sm:left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 p-2 text-ck-navy shadow-lg transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goNext();
                  }}
                  className="absolute right-2 sm:right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 p-2 text-ck-navy shadow-lg transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}

            <div
              className="relative flex h-full w-full max-w-6xl items-center justify-center overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <AnimatePresence initial={false} mode="wait" custom={slideDir}>
                <motion.div
                  key={visible[lightboxIndex].id}
                  className="flex flex-col items-center justify-center"
                  custom={slideDir}
                  initial={{ opacity: 0, x: slideDir * 80, scale: 0.96 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: slideDir * -80, scale: 0.96 }}
                  transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.2}
                  onDragEnd={(_, info) => {
                    if (info.offset.x < -80) goNext();
                    else if (info.offset.x > 80) goPrev();
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={visible[lightboxIndex].url}
                    alt={visible[lightboxIndex].caption}
                    draggable={false}
                    className="max-h-[80vh] max-w-full rounded-2xl object-contain shadow-2xl select-none"
                  />
                  {visible[lightboxIndex].caption && (
                    <p className="mt-4 max-w-2xl text-center text-sm font-semibold text-white/90">
                      {visible[lightboxIndex].caption}
                    </p>
                  )}
                  {visible.length > 1 && (
                    <p className="mt-2 text-xs text-white/60">
                      {lightboxIndex + 1} / {visible.length}
                    </p>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
