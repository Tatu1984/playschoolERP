import type { Metadata } from "next";
import { GalleryManager } from "@/components/gms/GalleryManager";
import { CATEGORIES, isConfigured, readManifest, sortItems } from "@/lib/gms/gallery";

export const metadata: Metadata = {
  title: "Gallery · GMS · Climb Kiddo",
};
export const dynamic = "force-dynamic";

export default async function GmsGalleryPage() {
  const configured = isConfigured();
  const manifest = configured ? await readManifest() : { items: [] };
  return (
    <GalleryManager
      initialItems={sortItems(manifest.items)}
      categories={CATEGORIES}
      configured={configured}
    />
  );
}
