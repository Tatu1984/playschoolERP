import { z } from "zod";

const mediaRef = z.object({
  id: z.string(),
  url: z.string(),
  kind: z.enum(["image", "video", "audio", "document"]),
  caption: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  placeholder: z.string().optional(),
});

export const sendMessageSchema = z
  .object({
    kind: z.enum(["TEXT", "VOICE", "FILE", "SYSTEM"]).default("TEXT"),
    body: z.string().default(""),
    durationSec: z.number().int().positive().max(600).optional(),
    attachment: mediaRef.optional(),
  })
  .refine((m) => m.kind !== "TEXT" || m.body.trim().length > 0, {
    message: "A text message needs some text",
    path: ["body"],
  })
  .refine((m) => m.kind !== "VOICE" || m.durationSec !== undefined, {
    message: "A voice note needs a duration",
    path: ["durationSec"],
  });

export const startConversationSchema = z.object({
  studentId: z.string().min(1),
  participantIds: z.array(z.string()).min(1),
  parentName: z.string().min(1),
  teacherName: z.string().min(1),
  subject: z.string().default(""),
  firstMessage: z.string().min(1),
});

export const createMeetingSchema = z.object({
  studentId: z.string().min(1),
  teacherName: z.string().min(1),
  parentName: z.string().min(1),
  mode: z.enum(["IN_PERSON", "VIDEO", "PHONE"]).default("IN_PERSON"),
  scheduledFor: z.iso.datetime(),
  durationMin: z.number().int().min(5).max(120).default(15),
  agenda: z.string().default(""),
  joinUrl: z.string().url().optional(),
});

export const meetingStatusSchema = z.object({
  status: z.enum(["REQUESTED", "CONFIRMED", "DECLINED", "COMPLETED"]),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type StartConversationInput = z.infer<typeof startConversationSchema>;
export type CreateMeetingInput = z.infer<typeof createMeetingSchema>;
