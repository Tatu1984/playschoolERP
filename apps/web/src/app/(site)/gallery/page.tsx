import type { Metadata } from "next";
import { PageHeader } from "@/components/sections/PageHeader";
import { GalleryGrid } from "@/components/sections/GalleryGrid";
import { CATEGORIES, isConfigured, readManifest, sortItems } from "@/lib/gms/gallery";

export const metadata: Metadata = {
  title: "Gallery · Climb Kiddo",
  description:
    "Photos and videos from a day at Climb Kiddo — classroom moments, performances and milestones.",
};

export const dynamic = "force-dynamic";

export default async function GalleryPage() {
  const configured = isConfigured();
  const manifest = configured ? await readManifest() : { items: [] };
  const items = sortItems(manifest.items);

  return (
    <>
      <PageHeader
        eyebrow="Gallery"
        title="Little moments,"
        highlight="big memories."
        description="A peek into life at Climb Kiddo — class days, performances, parties and the everyday magic in between."
      />

      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <GalleryGrid
            items={items}
            categories={CATEGORIES}
            configured={configured}
          />
        </div>
      </section>
    </>
  );
}
