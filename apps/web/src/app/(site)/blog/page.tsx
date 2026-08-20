import type { Metadata } from "next";
import { PageHeader } from "@/components/sections/PageHeader";
import { BlogIndexView } from "@/frontend/components/features/marketing/BlogViews";
import { BLOG_POSTS } from "@/shared/fixtures";

export const metadata: Metadata = {
  title: "Blog · Parenting, Learning & Nutrition · Climb Kiddo",
  description:
    "Practical parenting and early-learning writing from the Climb Kiddo teaching team — screen time, first-week nerves, lunchboxes, phonics and big feelings.",
};

export default function BlogIndexPage() {
  return (
    <>
      <PageHeader
        eyebrow="Blog"
        title="Things we've learned from"
        highlight="four hundred children"
        description="Written by the people who teach them — no listicles, no fluff, no selling."
      />
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
        {/* SSR'd from fixtures for SEO; swaps to CMS edits after hydration. */}
        <BlogIndexView initial={BLOG_POSTS} />
      </section>
    </>
  );
}
