import type { Metadata } from "next";
import { PageHeader } from "@/components/sections/PageHeader";
import { VisitBookingForm } from "@/frontend/components/features/marketing/VisitBookingForm";

export const metadata: Metadata = {
  title: "Book a Visit · Climb Kiddo",
  description: "Pick a day and time to visit Climb Kiddo Kathgola or Dhakuria — or book a video walkthrough.",
};

export default function VisitPage() {
  return (
    <>
      <PageHeader
        eyebrow="Admissions"
        title="Come and see a"
        highlight="normal school day"
        description="No staged tours. Mornings are busiest and best — bring your child if you can."
      />
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <VisitBookingForm />
      </section>
    </>
  );
}
