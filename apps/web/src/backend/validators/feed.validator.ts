import { z } from "zod";

const mediaRef = z.object({
  id: z.string(),
  url: z.string(),
  kind: z.enum(["image", "video", "audio", "document"]),
  caption: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  placeholder: z.string().optional(),
});

export const createActivitySchema = z.object({
  classroomId: z.string().min(1),
  kind: z
    .enum(["LEARNING", "PLAY", "MEAL", "NAP", "ART", "MUSIC", "OUTDOOR", "CELEBRATION"])
    .default("LEARNING"),
  title: z.string().min(1),
  body: z.string().default(""),
  media: z.array(mediaRef).default([]),
  studentIds: z.array(z.string()).default([]),
  published: z.boolean().default(false),
  internalNote: z.string().default(""),
});

export const updateActivitySchema = createActivitySchema.partial().omit({ classroomId: true });

export const commentSchema = z.object({ body: z.string().min(1).max(2000) });

export const createNoticeSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  audience: z.enum(["ALL", "PARENTS", "STAFF", "CLASSROOM"]).default("ALL"),
  classroomId: z.string().nullable().default(null),
  branchId: z.string().nullable().optional(),
  priority: z.enum(["NORMAL", "IMPORTANT", "URGENT"]).default("NORMAL"),
  expiresAt: z.iso.datetime().nullable().default(null),
  attachments: z.array(mediaRef).default([]),
  pinned: z.boolean().default(false),
  /** Publish immediately, or leave it as a draft. */
  publish: z.boolean().default(false),
});

export const updateNoticeSchema = createNoticeSchema.partial();

export type CreateActivityInput = z.infer<typeof createActivitySchema>;
export type UpdateActivityInput = z.infer<typeof updateActivitySchema>;
export type CreateNoticeInput = z.infer<typeof createNoticeSchema>;
export type UpdateNoticeInput = z.infer<typeof updateNoticeSchema>;
