import type { Metadata } from "next";
import { BlogPostView } from "@/frontend/components/features/marketing/BlogViews";
import { BLOG_POSTS } from "@/shared/fixtures";

export function generateStaticParams() {
  return BLOG_POSTS.filter((p) => p.status === "PUBLISHED").map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  if (!post) return { title: "Blog · Climb Kiddo" };
  return {
    title: `${post.title} · Climb Kiddo`,
    description: post.excerpt,
    openGraph: { title: post.title, description: post.excerpt, type: "article" },
  };
}

/**
 * No `notFound()` here: a post created in the CMS store has no fixture to match,
 * so the client view resolves the slug and shows its own empty state if needed.
 */
export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <article className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
      <BlogPostView slug={slug} initial={BLOG_POSTS} />
    </article>
  );
}
