import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BLOG_POSTS } from "@/shared/fixtures";
import { formatDate } from "@/frontend/utils/formatters";

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

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug && p.status === "PUBLISHED");
  if (!post) notFound();

  const related = BLOG_POSTS.filter(
    (p) => p.status === "PUBLISHED" && p.id !== post.id && p.category === post.category,
  ).slice(0, 2);

  return (
    <article className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
      <Button asChild variant="ghost" size="sm" className="font-bold">
        <Link href="/blog">
          <ArrowLeft /> All posts
        </Link>
      </Button>

      <header className="mt-4">
        <span className="block text-5xl" aria-hidden>
          {post.coverEmoji}
        </span>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold text-ck-navy/60">
          <Badge variant="secondary" className="rounded-full">
            {post.category}
          </Badge>
          <span>{formatDate(post.publishedAt ?? post.createdAt)}</span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> {post.readMinutes} min read
          </span>
        </div>
        <h1 className="mt-3 font-[family-name:var(--font-fredoka)] text-3xl leading-tight font-bold text-ck-navy sm:text-4xl">
          {post.title}
        </h1>
        <p className="mt-3 text-lg leading-relaxed text-ck-navy/70">{post.excerpt}</p>
        <p className="mt-3 text-sm font-bold text-ck-navy/60">By {post.author}</p>
      </header>

      <div className="mt-8 space-y-4 text-base leading-relaxed text-ck-navy/85">
        {post.body.split("\n").map((line, i) => {
          if (!line.trim()) return null;
          if (line.startsWith("## ")) {
            return (
              <h2 key={i} className="pt-4 font-[family-name:var(--font-fredoka)] text-xl font-bold text-ck-navy">
                {line.slice(3)}
              </h2>
            );
          }
          if (/^\d+\.\s/.test(line)) {
            return (
              <p key={i} className="pl-4">
                {line}
              </p>
            );
          }
          // **bold** at the start of a paragraph
          const bold = line.match(/^\*\*(.+?)\*\*(.*)$/);
          if (bold) {
            return (
              <p key={i}>
                <strong className="font-bold text-ck-navy">{bold[1]}</strong>
                {bold[2]}
              </p>
            );
          }
          return <p key={i}>{line.replace(/\*(.+?)\*/g, "$1")}</p>;
        })}
      </div>

      <div className="mt-8 flex flex-wrap gap-1.5">
        {post.tags.map((t) => (
          <Badge key={t} variant="outline" className="rounded-full">
            #{t}
          </Badge>
        ))}
      </div>

      <div className="mt-10 rounded-3xl bg-ck-navy p-6 text-center text-white">
        <h2 className="font-[family-name:var(--font-fredoka)] text-xl font-bold">Want to see this in practice?</h2>
        <p className="mx-auto mt-1.5 max-w-md text-sm text-white/80">
          Come and watch a normal morning at Climb Kiddo — no staged tour, no pressure.
        </p>
        <Button asChild className="mt-4 rounded-xl bg-white font-bold text-ck-navy hover:bg-white/90">
          <Link href="/admissions/visit">Book a visit</Link>
        </Button>
      </div>

      {related.length > 0 && (
        <div className="mt-10">
          <h2 className="font-[family-name:var(--font-fredoka)] text-lg font-bold text-ck-navy">
            More on {post.category}
          </h2>
          <div className="mt-3 space-y-2">
            {related.map((r) => (
              <Link
                key={r.id}
                href={`/blog/${r.slug}`}
                className="flex items-center gap-3 rounded-2xl border border-ck-cream p-3 transition hover:border-ck-red/30"
              >
                <span className="text-2xl" aria-hidden>
                  {r.coverEmoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold text-ck-navy">{r.title}</span>
                  <span className="block text-xs text-ck-navy/60">{r.readMinutes} min read</span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-ck-red" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
