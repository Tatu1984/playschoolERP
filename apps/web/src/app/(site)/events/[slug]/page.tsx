import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicEventDetail } from "@/frontend/components/features/marketing/EventViews";
import { admissionService } from "@/backend/services/admission.service";
import { schoolService } from "@/backend/services/school.service";
import { PUBLIC_SCOPE } from "@/backend/utils/scope.util";

export const revalidate = 300;

export async function generateStaticParams() {
  const events = await admissionService.listEvents(null);
  return events.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const event = await admissionService.getEvent(slug);
    return {
      title: `${event.title} · Climb Kiddo`,
      description: event.description.slice(0, 155),
    };
  } catch {
    // Next streams these pages (there is a loading boundary above them), so a
    // notFound() can no longer change the status code — it marks the document
    // noindex instead. Saying so here too stops the layout's "index, follow"
    // from contradicting it inside the same page.
    return { title: "Event · Climb Kiddo", robots: { index: false, follow: false } };
  }
}

export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await admissionService.getEvent(slug).catch(() => null);
  if (!event || !event.published) notFound();
  const branches = await schoolService.listBranches(PUBLIC_SCOPE);
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <PublicEventDetail slug={slug} initial={[event]} branches={branches} />
    </article>
  );
}
