import { z } from "zod";
import { dateKeyString, programSlug } from "./school.validator";

const mediaRef = z.object({
  id: z.string(),
  url: z.string(),
  kind: z.enum(["image", "video", "audio", "document"]),
  caption: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  placeholder: z.string().optional(),
});

export const createEventSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  description: z.string().default(""),
  kind: z
    .enum(["CELEBRATION", "SPORTS", "WORKSHOP", "PTM", "HOLIDAY", "TRIP", "COMPETITION"])
    .default("CELEBRATION"),
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime(),
  venue: z.string().default(""),
  branchId: z.string().nullable().optional(),
  coverEmoji: z.string().default("🎉"),
  media: z.array(mediaRef).default([]),
  rsvpEnabled: z.boolean().default(true),
  published: z.boolean().default(false),
});
export const updateEventSchema = createEventSchema.partial();

export const rsvpSchema = z.object({ guests: z.number().int().min(0).max(10).default(1) });

export const createInquirySchema = z.object({
  parentName: z.string().min(2),
  email: z.email(),
  phone: z.string().min(6),
  childName: z.string().min(1),
  childDob: z.iso.datetime().or(dateKeyString),
  programSlug,
  branchId: z.string().min(1),
  message: z.string().max(2000).default(""),
});

export const createApplicationSchema = z.object({
  inquiryId: z.string().nullable().default(null),
  childName: z.string().min(1),
  childDob: z.iso.datetime().or(dateKeyString),
  programSlug,
  branchId: z.string().min(1),
  parentName: z.string().min(2),
  email: z.email(),
  phone: z.string().min(6),
  address: z.string().default(""),
  documents: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        uploaded: z.boolean().default(false),
        fileName: z.string().optional(),
      }),
    )
    .default([]),
});

export const applicationStatusSchema = z.object({
  status: z.enum(["SUBMITTED", "UNDER_REVIEW", "DOCS_PENDING", "SEAT_OFFERED", "ACCEPTED", "REJECTED"]),
  note: z.string().optional(),
});

export const inquiryStageSchema = z.object({
  stage: z.enum(["NEW", "CONTACTED", "VISIT_SCHEDULED", "APPLICATION", "ENROLLED", "LOST"]),
});

export const inquiryNoteSchema = z.object({ body: z.string().min(1).max(2000) });

export const createVisitSchema = z.object({
  parentName: z.string().min(2),
  phone: z.string().min(6),
  email: z.email(),
  branchId: z.string().min(1),
  date: dateKeyString,
  slot: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  childAge: z.number().int().min(0).max(10).default(3),
  mode: z.enum(["CAMPUS", "VIDEO"]).default("CAMPUS"),
  note: z.string().max(1000).default(""),
});

export const visitStatusSchema = z.object({
  status: z.enum(["REQUESTED", "CONFIRMED", "COMPLETED", "CANCELLED"]),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type CreateInquiryInput = z.infer<typeof createInquirySchema>;
export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export type CreateVisitInput = z.infer<typeof createVisitSchema>;
