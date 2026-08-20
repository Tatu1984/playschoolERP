import { z } from "zod";

const accent = z.enum(["red", "orange", "blue", "green", "magenta", "navy"]);

export const cmsPageSchema = z.object({
  title: z.string().min(1).optional(),
  heroHeading: z.string().optional(),
  heroSub: z.string().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
  sections: z
    .array(z.object({ id: z.string(), heading: z.string(), body: z.string() }))
    .optional(),
});

export const blogPostSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/).optional(),
  title: z.string().min(1).optional(),
  excerpt: z.string().optional(),
  body: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  author: z.string().optional(),
  coverEmoji: z.string().optional(),
  readMinutes: z.number().int().min(1).max(60).optional(),
  publish: z.boolean().optional(),
});

export const bannerSchema = z.object({
  title: z.string().min(1).optional(),
  subtitle: z.string().optional(),
  ctaLabel: z.string().optional(),
  ctaHref: z.string().optional(),
  accent: accent.optional(),
  active: z.boolean().optional(),
  startsOn: z.iso.datetime().nullable().optional(),
  endsOn: z.iso.datetime().nullable().optional(),
});

export const mediaAssetSchema = z.object({
  label: z.string().min(1),
  kind: z.enum(["image", "video", "audio", "document"]).default("image"),
  category: z.string().default(""),
  sizeKb: z.number().int().min(0).default(0),
  emoji: z.string().default("🖼️"),
  url: z.string().default(""),
  usedOn: z.array(z.string()).default([]),
});

export const testimonialSchema = z.object({
  parentName: z.string().min(1).optional(),
  childName: z.string().optional(),
  relation: z.string().optional(),
  rating: z.number().int().min(1).max(5).optional(),
  quote: z.string().min(1).optional(),
  emoji: z.string().optional(),
  videoUrl: z.string().url().nullable().optional(),
  published: z.boolean().optional(),
});

export type CmsPageInput = z.infer<typeof cmsPageSchema>;
export type BlogPostInput = z.infer<typeof blogPostSchema>;
export type BannerInput = z.infer<typeof bannerSchema>;
export type MediaAssetInput = z.infer<typeof mediaAssetSchema>;
export type TestimonialInput = z.infer<typeof testimonialSchema>;
