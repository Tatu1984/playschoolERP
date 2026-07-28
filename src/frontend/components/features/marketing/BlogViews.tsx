"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/frontend/components/ui/EmptyState";
import { useLiveContent } from "@/frontend/hooks/useLiveContent";
import type { BlogPost } from "@/shared/types/learning.types";
import { formatCompact } from "@/shared/utils/common.util";
import { formatDate } from "@/frontend/utils/formatters";

/** Newest-first published posts, from the CMS store once hydrated. */
function usePosts(initial: BlogPost[]): BlogPost[] {
  const posts = useLiveContent(initial, (s) => s.blogPosts);
  return posts
    .filter((p) => p.status === "PUBLISHED")
    .sort((a, b) => (b.publishedAt ?? b.createdAt).localeCompare(a.publishedAt ?? a.createdAt));
}

export function BlogIndexView({ initial }: { initial: BlogPost[] }) {
  const posts = usePosts(initial);
  const [featured, ...rest] = posts;
  const categories = Array.from(new Set(posts.map((p) => p.category)));

  if (posts.length === 0) {
    return <EmptyState emoji="✏️" title="No posts published yet" description="Check back soon." />;
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <Badge key={c} variant="secondary" className="rounded-full px-3 font-bold">
            {c}
          </Badge>
        ))}
      </div>

      {featured && (
        <Link href={`/blog/${featured.slug}`} className="mt-6 block">
          <Card className="overflow-hidden rounded-[2rem] border-ck-cream transition hover:shadow-xl">
            <CardContent className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[160px_1fr]">
              <span
                className="grid aspect-square w-32 place-items-center rounded-3xl bg-gradient-to-br from-ck-orange/20 to-ck-red/10 text-6xl lg:w-full"
                aria-hidden
              >
                {featured.coverEmoji}
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-ck-navy/60">
                  <Badge variant="outline" className="rounded-full">
                    {featured.category}
                  </Badge>
                  <span>{formatDate(featured.publishedAt ?? featured.createdAt)}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {featured.readMinutes} min read
                  </span>
                </div>
                <h2 className="mt-2 font-[family-name:var(--font-fredoka)] text-2xl font-bold text-ck-navy sm:text-3xl">
                  {featured.title}
                </h2>
                <p className="mt-2 leading-relaxed text-ck-navy/70">{featured.excerpt}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-ck-red">
                  Read it <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rest.map((post) => (
          <Link key={post.id} href={`/blog/${post.slug}`}>
            <Card className="h-full overflow-hidden rounded-3xl border-ck-cream transition hover:shadow-lg">
              <CardContent className="p-5">
                <span className="text-4xl" aria-hidden>
                  {post.coverEmoji}
                </span>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-bold text-ck-navy/60">
                  <Badge variant="outline" className="rounded-full text-[10px]">
                    {post.category}
                  </Badge>
                  <span>{post.readMinutes} min</span>
                  <span>{formatCompact(post.views)} reads</span>
                </div>
                <h3 className="mt-2 font-[family-name:var(--font-fredoka)] text-lg leading-snug font-bold text-ck-navy">
                  {post.title}
                </h3>
                <p className="mt-1.5 line-clamp-3 text-sm text-ck-navy/70">{post.excerpt}</p>
                <p className="mt-3 text-xs text-ck-navy/50">
                  {post.author} · {formatDate(post.publishedAt ?? post.createdAt)}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}

export function BlogPostView({ slug, initial }: { slug: string; initial: BlogPost[] }) {
  const posts = usePosts(initial);
  const post = posts.find((p) => p.slug === slug);
  const related = post
    ? posts.filter((p) => p.id !== post.id && p.category === post.category).slice(0, 2)
    : [];

  if (!post) {
    return (
      <EmptyState
        emoji="📕"
        title="Post not found"
        description="It may have been unpublished."
        action={
          <Button asChild>
            <Link href="/blog">All posts</Link>
          </Button>
        }
      />
    );
  }

  return (
    <>
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

      {post.tags.length > 0 && (
        <div className="mt-8 flex flex-wrap gap-1.5">
          {post.tags.map((t) => (
            <Badge key={t} variant="outline" className="rounded-full">
              #{t}
            </Badge>
          ))}
        </div>
      )}

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
    </>
  );
}
