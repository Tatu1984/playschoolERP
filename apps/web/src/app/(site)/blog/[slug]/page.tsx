import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogPostView } from "@/frontend/components/features/marketing/BlogViews";
import { cmsService } from "@/backend/services/cms.service";

export const revalidate = 300;

export async function generateStaticParams() {
  const posts = await cmsService.listPosts(null);
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const post = await cmsService.getPost(null, slug);
    return {
      title: `${post.title} · Climb Kiddo`,
      description: post.excerpt,
      openGraph: { title: post.title, description: post.excerpt, type: "article" },
    };
  } catch {
    // Next streams these pages (there is a loading boundary above them), so a
    // notFound() can no longer change the status code — it marks the document
    // noindex instead. Saying so here too stops the layout's "index, follow"
    // from contradicting it inside the same page.
    return { title: "Blog · Climb Kiddo", robots: { index: false, follow: false } };
  }
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // A slug with no published post behind it is a 404 now that the database
  // decides what exists — there is no client-side store to resolve it later.
  const post = await cmsService.getPost(null, slug).catch(() => null);
  if (!post) notFound();
  return (
    <article className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
      <BlogPostView slug={slug} initial={[post]} />
    </article>
  );
}
