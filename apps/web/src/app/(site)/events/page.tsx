import type { Metadata } from "next";
import { PageHeader } from "@/components/sections/PageHeader";
import { PublicEventsView } from "@/frontend/components/features/marketing/EventViews";
import { admissionService } from "@/backend/services/admission.service";

// Published events come from the database; regenerate rather than freeze.
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Events & Calendar · Climb Kiddo",
  description:
    "Annual day, sports day, workshops, field trips and parent-teacher meetings at Climb Kiddo Kolkata.",
};

export default async function EventsPage() {
  const events = await admissionService.listEvents(null);
  return (
    <>
      <PageHeader
        eyebrow="Events"
        title="Something is always"
        highlight="about to happen"
        description="Annual day, sports day, workshops for parents and field trips for the children. Everyone is invited to most of it."
      />
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
        <PublicEventsView initial={events} />
      </section>
    </>
  );
}
