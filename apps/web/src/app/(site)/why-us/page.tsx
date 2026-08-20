import type { Metadata } from "next";
import { PageHeader } from "@/components/sections/PageHeader";
import { WhyUs } from "@/components/sections/WhyUs";
import { Faq } from "@/components/sections/Faq";

export const metadata: Metadata = {
  title: "Why Climb Kiddo · Climb Kiddo",
  description:
    "Why parents choose Climb Kiddo — safety, ratios, joyful curriculum, and daily updates.",
};

export default function WhyUsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Why Us"
        title="A home away from home where"
        highlight="kids really thrive"
        description="Six things parents tell us they couldn't find anywhere else — and the numbers behind why families stay."
      />
      <WhyUs showHeading={false} />
      <Faq />
    </>
  );
}
