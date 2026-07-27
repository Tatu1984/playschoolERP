import type { Metadata } from "next";
import Link from "next/link";
import { Quote, Star } from "lucide-react";
import { PageHeader } from "@/components/sections/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TESTIMONIALS } from "@/shared/fixtures";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Parent Testimonials · Climb Kiddo",
  description:
    "What Climb Kiddo parents actually say — separation anxiety, daily updates, live cameras and the teachers who made the difference.",
};

export default function TestimonialsPage() {
  const published = TESTIMONIALS.filter((t) => t.published);
  const avg = published.length
    ? (published.reduce((s, t) => s + t.rating, 0) / published.length).toFixed(1)
    : "—";

  return (
    <>
      <PageHeader
        eyebrow="Parents"
        title="In their words, not"
        highlight="ours"
        description="Unedited except for length. We asked families what they'd tell a friend who was deciding."
      />

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
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
              className={cn(
                "flex h-full flex-col rounded-3xl border-ck-cream",
                i === 0 && "md:col-span-2 lg:col-span-1",
              )}
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

        <div className="mt-12 rounded-3xl bg-ck-navy p-6 text-center text-white sm:p-10">
          <h2 className="font-[family-name:var(--font-fredoka)] text-2xl font-bold sm:text-3xl">
            Come and form your own opinion
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-white/80">
            Reviews are useful. Standing in a classroom at 10 AM on a Tuesday is better.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button asChild className="rounded-xl bg-white font-bold text-ck-navy hover:bg-white/90">
              <Link href="/admissions/visit">Book a visit</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-xl border-white/40 font-bold text-white hover:bg-white/10">
              <Link href="/campus-tour">Take the virtual tour</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
