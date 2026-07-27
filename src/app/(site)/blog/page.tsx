import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { PageHeader } from "@/components/sections/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { BLOG_POSTS } from "@/shared/fixtures";
import { formatCompact } from "@/shared/utils/common.util";
import { formatDate } from "@/frontend/utils/formatters";

export const metadata: Metadata = {
  title: "Blog · Parenting, Learning & Nutrition · Climb Kiddo",
  description:
    "Practical parenting and early-learning writing from the Climb Kiddo teaching team — screen time, first-week nerves, lunchboxes, phonics and big feelings.",
};

export default function BlogIndexPage() {
  const posts = BLOG_POSTS.filter((p) => p.status === "PUBLISHED").sort((a, b) =>
    (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""),
  );
  const [featured, ...rest] = posts;
  const categories = Array.from(new Set(posts.map((p) => p.category)));

  return (
    <>
      <PageHeader
        eyebrow="Blog"
        title="Things we've learned from"
        highlight="four hundred children"
        description="Written by the people who teach them — no listicles, no fluff, no selling."
      />

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
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
                <span className="grid aspect-square w-32 place-items-center rounded-3xl bg-gradient-to-br from-ck-orange/20 to-ck-red/10 text-6xl lg:w-full" aria-hidden>
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
      </section>
    </>
  );
}
