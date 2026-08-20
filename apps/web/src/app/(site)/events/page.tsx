import type { Metadata } from "next";
import { PageHeader } from "@/components/sections/PageHeader";
import { PublicEventsView } from "@/frontend/components/features/marketing/EventViews";
import { EVENTS } from "@/shared/fixtures";

export const metadata: Metadata = {
  title: "Events & Calendar · Climb Kiddo",
  description:
    "Annual day, sports day, workshops, field trips and parent-teacher meetings at Climb Kiddo Kolkata.",
};

export default function EventsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Events"
        title="Something is always"
        highlight="about to happen"
        description="Annual day, sports day, workshops for parents and field trips for the children. Everyone is invited to most of it."
      />
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
        <PublicEventsView initial={EVENTS} />
      </section>
    </>
  );
}
