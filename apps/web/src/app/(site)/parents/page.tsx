import type { Metadata } from "next";
import { PageHeader } from "@/components/sections/PageHeader";
import { Testimonials } from "@/components/sections/Testimonials";
import { Faq } from "@/components/sections/Faq";
import { Contact } from "@/components/sections/Contact";

export const metadata: Metadata = {
  title: "Parents · Climb Kiddo",
  description:
    "Parent stories, ratings, and answers to the questions parents ask most.",
};

export default function ParentsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Parents"
        title="Loved by little climbers and"
        highlight="their grown-ups"
        description="Honest stories from real Climb Kiddo families — and answers to every question you might have."
      />
      <Testimonials showHeading={false} />
      <Faq />
      <Contact />
    </>
  );
}
