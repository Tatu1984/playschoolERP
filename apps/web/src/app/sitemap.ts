import type { MetadataRoute } from "next";
import { publicService } from "@/backend/services/public.service";
import { cmsService } from "@/backend/services/cms.service";
import { admissionService } from "@/backend/services/admission.service";
import { SITE } from "@/shared/constants/site";

/**
 * Public pages only. Everything behind a login (/admin, /teacher, /parent, /kids,
 * /gms) is deliberately absent and blocked in robots.ts.
 */
// Regenerated on the same cadence as the pages it lists, so a post published
// in the CMS is crawlable without a redeploy.
export const revalidate = 600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE.url.replace(/\/$/, "");
  const [PROGRAMS, BLOG_POSTS, EVENTS] = await Promise.all([
    publicService.programs(),
    cmsService.listPosts(null),
    admissionService.listEvents(null),
  ]);

  const staticPages: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    { path: "/", priority: 1, changeFrequency: "weekly" },
    { path: "/about", priority: 0.8, changeFrequency: "monthly" },
    { path: "/programs", priority: 0.9, changeFrequency: "monthly" },
    { path: "/activities", priority: 0.7, changeFrequency: "monthly" },
    { path: "/abacus", priority: 0.6, changeFrequency: "monthly" },
    { path: "/teachers-training", priority: 0.6, changeFrequency: "monthly" },
    { path: "/admissions", priority: 0.9, changeFrequency: "weekly" },
    { path: "/admissions/apply", priority: 0.8, changeFrequency: "monthly" },
    { path: "/admissions/visit", priority: 0.8, changeFrequency: "monthly" },
    { path: "/admissions/seats", priority: 0.7, changeFrequency: "daily" },
    { path: "/campus-tour", priority: 0.7, changeFrequency: "monthly" },
    { path: "/events", priority: 0.7, changeFrequency: "weekly" },
    { path: "/gallery", priority: 0.6, changeFrequency: "weekly" },
    { path: "/testimonials", priority: 0.6, changeFrequency: "monthly" },
    { path: "/blog", priority: 0.8, changeFrequency: "weekly" },
    { path: "/why-us", priority: 0.7, changeFrequency: "monthly" },
    { path: "/parents", priority: 0.5, changeFrequency: "monthly" },
    { path: "/careers", priority: 0.5, changeFrequency: "monthly" },
    { path: "/contact", priority: 0.8, changeFrequency: "monthly" },
    { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
    { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
  ];

  const now = new Date();

  return [
    ...staticPages.map((p) => ({
      url: `${base}${p.path}`,
      lastModified: now,
      changeFrequency: p.changeFrequency,
      priority: p.priority,
    })),
    ...PROGRAMS.map((program) => ({
      url: `${base}/programs/${program.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...BLOG_POSTS.map((post) => ({
      url: `${base}/blog/${post.slug}`,
      lastModified: new Date(post.publishedAt ?? post.createdAt),
      changeFrequency: "yearly" as const,
      priority: 0.6,
    })),
    ...EVENTS.map((event) => ({
      url: `${base}/events/${event.slug}`,
      lastModified: new Date(event.createdAt),
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
  ];
}
