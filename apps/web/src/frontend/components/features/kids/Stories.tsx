"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Pause, Play, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useErpStore } from "@/frontend/store/erpStore";
import { useKidsProfile } from "@/frontend/hooks/useKidsProfile";
import { CATALOGUE } from "@/shared/fixtures";
import { EmptyState } from "@/frontend/components/ui/EmptyState";
import { ACCENT_GRADIENT } from "@/frontend/utils/accents";
import { cn } from "@/lib/utils";

export function StoriesList() {
  const { journey } = useKidsProfile();

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h1 className="font-[family-name:var(--font-baloo)] text-2xl font-extrabold text-ck-navy">Story time</h1>
        <p className="text-sm font-semibold text-ck-navy/75">
          {journey.finishedStories.length} of {CATALOGUE.stories.length} finished
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {CATALOGUE.stories.map((s) => {
          const done = journey.finishedStories.includes(s.id);
          return (
            <Link
              key={s.id}
              href={`/kids/stories/${s.id}`}
              className={cn(
                "flex items-center gap-4 rounded-3xl bg-gradient-to-br p-4 transition hover:scale-[1.02] active:scale-95",
                ACCENT_GRADIENT[s.accent],
              )}
            >
              <span className="text-5xl" aria-hidden>
                {s.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-[family-name:var(--font-baloo)] text-lg font-extrabold text-ck-navy">{s.title}</p>
                <p className="truncate text-sm text-ck-navy/75">{s.moral}</p>
                <p className="mt-1 text-[10px] font-bold text-ck-navy/75">
                  {s.minutes} min · {s.ageTier} yrs · {s.pages.length} pages
                </p>
              </div>
              {done && (
                <span className="text-2xl" aria-label="Finished">
                  ✅
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function StoryPlayer({ storyId }: { storyId: string }) {
  const { child, journey } = useKidsProfile();
  const finishStory = useErpStore((s) => s.finishStory);
  const story = CATALOGUE.stories.find((s) => s.id === storyId);

  const [page, setPage] = useState(0);
  const [narrating, setNarrating] = useState(false);
  const [finished, setFinished] = useState(false);

  if (!story) {
    return (
      <EmptyState
        emoji="📕"
        title="Story not found"
        action={
          <Button asChild>
            <Link href="/kids/stories">Back to stories</Link>
          </Button>
        }
      />
    );
  }

  const current = story.pages[page];
  const isLast = page === story.pages.length - 1;
  const alreadyRead = journey.finishedStories.includes(story.id);
  const storyKey = story.id;

  /** Uses the browser's speech synthesis — no external service, works offline. */
  function narrate() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      toast.info("Narration isn't supported on this device");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(current.text);
    utterance.rate = 0.85;
    utterance.pitch = 1.15;
    utterance.onend = () => setNarrating(false);
    setNarrating(true);
    window.speechSynthesis.speak(utterance);
  }

  function stopNarration() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setNarrating(false);
  }

  function next() {
    stopNarration();
    if (isLast) {
      if (child && !alreadyRead) {
        finishStory(child.id, storyKey);
        toast.success("⭐ You earned a star for finishing the story!");
      }
      setFinished(true);
    } else {
      setPage((p) => p + 1);
    }
  }

  if (finished) {
    return (
      <div className="space-y-4 text-center">
        <span className="block text-7xl" aria-hidden>
          {story.emoji}
        </span>
        <h1 className="font-[family-name:var(--font-baloo)] text-2xl font-extrabold text-ck-navy">The End</h1>
        <p className="mx-auto max-w-md rounded-2xl bg-ck-orange/15 p-3 font-[family-name:var(--font-baloo)] text-base font-extrabold text-amber-800">
          {story.moral}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button
            size="lg"
            className="h-12 font-extrabold"
            onClick={() => {
              setPage(0);
              setFinished(false);
            }}
          >
            Read it again
          </Button>
          <Button size="lg" variant="outline" className="h-12 font-extrabold" asChild>
            <Link href="/kids/stories">More stories</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/kids/stories">
            <ChevronLeft /> Stories
          </Link>
        </Button>
        <p className="font-[family-name:var(--font-baloo)] text-sm font-extrabold text-ck-navy/75">
          Page {page + 1} of {story.pages.length}
        </p>
        <Button
          variant={narrating ? "default" : "outline"}
          size="sm"
          onClick={narrating ? stopNarration : narrate}
          aria-label={narrating ? "Stop reading aloud" : "Read this page aloud"}
        >
          {narrating ? <Pause /> : <Volume2 />}
          {narrating ? "Stop" : "Read to me"}
        </Button>
      </div>

      <article
        className={cn(
          "flex min-h-[22rem] flex-col items-center justify-center gap-6 rounded-[2rem] bg-gradient-to-br p-6 text-center",
          ACCENT_GRADIENT[story.accent],
        )}
      >
        <span className="animate-bob text-8xl" aria-hidden>
          {current.emoji}
        </span>
        <p className="max-w-lg font-[family-name:var(--font-baloo)] text-xl leading-relaxed font-bold text-ck-navy sm:text-2xl">
          {current.text}
        </p>
      </article>

      {/* page dots */}
      <div className="flex justify-center gap-1.5">
        {story.pages.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              stopNarration();
              setPage(i);
            }}
            aria-label={`Go to page ${i + 1}`}
            className={cn("h-2.5 rounded-full transition-all", i === page ? "w-6 bg-ck-red" : "w-2.5 bg-ck-navy/20")}
          />
        ))}
      </div>

      <div className="flex justify-between gap-3">
        <Button
          variant="outline"
          size="lg"
          className="h-12 flex-1 font-extrabold"
          disabled={page === 0}
          onClick={() => {
            stopNarration();
            setPage((p) => p - 1);
          }}
        >
          <ChevronLeft /> Back
        </Button>
        <Button size="lg" className="h-12 flex-1 font-extrabold" onClick={next}>
          {isLast ? "Finish" : "Next"} {isLast ? <Play /> : <ChevronRight />}
        </Button>
      </div>
    </div>
  );
}
