import type { Metadata } from "next";
import { PageHeader } from "@/components/sections/PageHeader";
import { ApplicationWizard } from "@/frontend/components/features/marketing/ApplicationWizard";

export const metadata: Metadata = {
  title: "Apply Online · Climb Kiddo Admissions",
  description: "Four short steps: your child, your details, documents, review. Takes about five minutes.",
};

export default function ApplyPage() {
  return (
    <>
      <PageHeader
        eyebrow="Admissions"
        title="Let's get your little climber"
        highlight="enrolled"
        description="Four short steps, about five minutes. You can save the documents for later — bring originals to your visit."
      />
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <ApplicationWizard />
      </section>
    </>
  );
}
