import type { Metadata } from "next";
import { PageHeader } from "@/components/sections/PageHeader";
import { BlogIndexView } from "@/frontend/components/features/marketing/BlogViews";
import { cmsService } from "@/backend/services/cms.service";

// Published posts come from the CMS, so the page is regenerated rather than
// frozen at build time.
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Blog · Parenting, Learning & Nutrition · Climb Kiddo",
  description:
    "Practical parenting and early-learning writing from the Climb Kiddo teaching team — screen time, first-week nerves, lunchboxes, phonics and big feelings.",
};

export default async function BlogIndexPage() {
  const posts = await cmsService.listPosts(null);
  return (
    <>
      <PageHeader
        eyebrow="Blog"
        title="Things we've learned from"
        highlight="four hundred children"
        description="Written by the people who teach them — no listicles, no fluff, no selling."
      />
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
        {/* Server-rendered from the database, so crawlers get the real posts. */}
        <BlogIndexView initial={posts} />
      </section>
    </>
  );
}
