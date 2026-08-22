"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

/** A child may be looking at this alone — no stack traces, no jargon. */
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <span className="block animate-bob text-7xl" aria-hidden>
        🙈
      </span>
      <h1 className="mt-4 font-[family-name:var(--font-baloo)] text-2xl font-extrabold text-ck-navy">
        Oops! That didn&apos;t work
      </h1>
      <p className="mt-2 font-semibold text-ck-navy/75">Let&apos;s try that again.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button size="lg" className="h-12 rounded-2xl px-6 font-extrabold" onClick={reset}>
          Try again
        </Button>
        <Button size="lg" variant="outline" className="h-12 rounded-2xl px-6 font-extrabold" asChild>
          <Link href="/kids">Back to games</Link>
        </Button>
      </div>
    </div>
  );
}
