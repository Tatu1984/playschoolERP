import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/sections/PageHeader";
import { Button } from "@/components/ui/button";
import { TestimonialsWall } from "@/frontend/components/features/marketing/TestimonialsWall";
import { cmsService } from "@/backend/services/cms.service";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Parent Testimonials · Climb Kiddo",
  description:
    "What Climb Kiddo parents actually say — separation anxiety, daily updates, live cameras and the teachers who made the difference.",
};

export default async function TestimonialsPage() {
  const testimonials = await cmsService.listTestimonials(null);
  return (
    <>
      <PageHeader
        eyebrow="Parents"
        title="In their words, not"
        highlight="ours"
        description="Unedited except for length. We asked families what they'd tell a friend who was deciding."
      />

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
        <TestimonialsWall initial={testimonials} />

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
