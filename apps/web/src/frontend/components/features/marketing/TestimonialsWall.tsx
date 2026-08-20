"use client";

import { Quote, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/frontend/components/ui/EmptyState";
import { useLiveContent } from "@/frontend/hooks/useLiveContent";
import type { Testimonial } from "@/shared/types/learning.types";
import { cn } from "@/lib/utils";

/** Published parent testimonials, live from the CMS store once hydrated. */
export function TestimonialsWall({ initial }: { initial: Testimonial[] }) {
  const all = useLiveContent(initial, (s) => s.testimonials);
  const published = all.filter((t) => t.published);
  const avg = published.length
    ? (published.reduce((s, t) => s + t.rating, 0) / published.length).toFixed(1)
    : "—";

  if (published.length === 0) {
    return <EmptyState emoji="💬" title="No testimonials published yet" />;
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-center gap-6 rounded-3xl bg-ck-cream/40 p-6">
        <div className="text-center">
          <p className="font-[family-name:var(--font-fredoka)] text-4xl font-bold text-ck-navy">{avg}</p>
          <div className="mt-1 flex justify-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="h-4 w-4 fill-ck-orange text-ck-orange" />
            ))}
          </div>
          <p className="mt-1 text-xs font-bold text-ck-navy/60">average rating</p>
        </div>
        <div className="text-center">
          <p className="font-[family-name:var(--font-fredoka)] text-4xl font-bold text-ck-navy">{published.length}</p>
          <p className="mt-1 text-xs font-bold text-ck-navy/60">families reviewed</p>
        </div>
        <div className="text-center">
          <p className="font-[family-name:var(--font-fredoka)] text-4xl font-bold text-ck-navy">96%</p>
          <p className="mt-1 text-xs font-bold text-ck-navy/60">return next year</p>
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {published.map((t, i) => (
          <Card
            key={t.id}
            className={cn("flex h-full flex-col rounded-3xl border-ck-cream", i === 0 && "md:col-span-2 lg:col-span-1")}
          >
            <CardContent className="flex flex-1 flex-col p-6">
              <Quote className="h-6 w-6 text-ck-red/30" />
              <p className="mt-3 flex-1 leading-relaxed text-ck-navy/85">{t.quote}</p>
              <div className="mt-4 flex items-center gap-3 border-t border-ck-cream pt-4">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-ck-sky text-xl" aria-hidden>
                  {t.emoji}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-bold text-ck-navy">{t.parentName}</p>
                  <p className="truncate text-xs text-ck-navy/60">
                    {t.relation} of {t.childName}
                  </p>
                </div>
                <div className="ml-auto flex shrink-0 gap-0.5">
                  {Array.from({ length: t.rating }).map((_, s) => (
                    <Star key={s} className="h-3.5 w-3.5 fill-ck-orange text-ck-orange" />
                  ))}
                </div>
              </div>
              {t.videoUrl && (
                <Badge variant="secondary" className="mt-3 w-fit rounded-full font-bold">
                  🎥 Video testimonial
                </Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
