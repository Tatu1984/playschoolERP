import type { Metadata } from "next";
import { PageHeader } from "@/components/sections/PageHeader";
import { CampusTour } from "@/frontend/components/features/marketing/CampusTour";

export const metadata: Metadata = {
  title: "Campus Tour · Climb Kiddo",
  description:
    "Walk through the Climb Kiddo campus — classrooms, art room, outdoor play, kitchen and safety setup — with teacher introductions.",
};

export default function CampusTourPage() {
  return (
    <>
      <PageHeader
        eyebrow="Campus Tour"
        title="Have a look around"
        highlight="before you visit"
        description="Tap any spot on the map, or take the guided tour and we'll walk you through it in order."
      />
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
        <CampusTour />
      </section>
    </>
  );
}
