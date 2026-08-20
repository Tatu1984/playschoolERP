import type { Metadata } from "next";
import { PageHeader } from "@/components/sections/PageHeader";
import { Contact } from "@/components/sections/Contact";
import { BranchMaps } from "@/frontend/components/features/marketing/BranchMaps";

export const metadata: Metadata = {
  title: "Contact · Climb Kiddo",
  description:
    "Book a free visit, call us, or send a message — we'll get back within the hour.",
};

export default function ContactPage() {
  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Come visit us. Bring your"
        highlight="little climber."
        description="The best way to feel Climb Kiddo is to walk through our doors. Book a free visit — we'll show you around and let your child play."
      />
      <Contact />
      <BranchMaps />
    </>
  );
}
