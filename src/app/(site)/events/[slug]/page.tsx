import type { Metadata } from "next";
import { PublicEventDetail } from "@/frontend/components/features/marketing/EventViews";
import { BRANCHES, EVENTS } from "@/shared/fixtures";

export function generateStaticParams() {
  return EVENTS.filter((e) => e.published).map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = EVENTS.find((e) => e.slug === slug);
  if (!event) return { title: "Event · Climb Kiddo" };
  return {
    title: `${event.title} · Climb Kiddo`,
    description: event.description.slice(0, 155),
  };
}

export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <PublicEventDetail slug={slug} initial={EVENTS} branches={BRANCHES} />
    </article>
  );
}
