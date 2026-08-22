"use client";

import { History } from "lucide-react";
import { useCoverage } from "@/frontend/hooks/useCoverage";
import { formatDate } from "@/frontend/utils/formatters";
import { cn } from "@/lib/utils";

/**
 * "These numbers cover the last 120 days."
 *
 * Every total on a portal screen is a total within the window the bootstrap
 * fetched. Saying so is not an apology for a limitation — it is the difference
 * between a figure a parent can rely on and one they cannot. A school office
 * asked "how many days has she missed this year?" needs to know whether the
 * screen is answering that question or a different one.
 *
 * Renders nothing when the collection is neither windowed nor truncated, which
 * includes the demo store: there, the data really is everything there is.
 */
export function CoverageNote({
  collection,
  noun = "Totals",
  className,
}: {
  /** The bootstrap collection this screen counts — "attendance", "messages". */
  collection: string;
  /** What is being counted, for the sentence: "Totals", "Counts", "Messages". */
  noun?: string;
  className?: string;
}) {
  const { windowed, truncated, since, days } = useCoverage(collection);
  if (!windowed && !truncated) return null;

  const sentences: string[] = [];
  if (windowed && since) {
    sentences.push(`${noun} cover the last ${days} days, from ${formatDate(since.toISOString())}.`);
  }
  if (truncated) {
    sentences.push(
      windowed
        ? "Only the most recent records were loaded, so even this window is incomplete."
        : `${noun} show the most recent records only — there are older ones.`,
    );
  }
  sentences.push("The office system holds the full history.");

  return (
    <p
      className={cn("flex items-start gap-1.5 text-xs text-muted-foreground", className)}
      role="note"
    >
      <History className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>{sentences.join(" ")}</span>
    </p>
  );
}
