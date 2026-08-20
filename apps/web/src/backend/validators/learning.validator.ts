import { z } from "zod";
import { dateKeyString, programSlug } from "./school.validator";

const skill = z.enum(["cognitive", "language", "motor", "social", "emotional", "creative"]);

export const createLessonSchema = z.object({
  title: z.string().min(1),
  programSlug,
  classroomId: z.string().nullable().default(null),
  date: dateKeyString,
  slot: z.enum(["MORNING", "MIDDAY", "AFTERNOON"]).default("MORNING"),
  objective: z.string().default(""),
  materials: z.array(z.string()).default([]),
  steps: z.array(z.string()).default([]),
  skillTags: z.array(z.string()).default([]),
  status: z.enum(["PLANNED", "IN_PROGRESS", "DONE", "SKIPPED"]).default("PLANNED"),
  homework: z.string().default(""),
});
export const updateLessonSchema = createLessonSchema.partial();

export const upsertReportSchema = z.object({
  studentId: z.string().min(1),
  term: z.string().min(1),
  scores: z.record(skill, z.number().int().min(0).max(100)),
  teacherRemark: z.string().default(""),
  strengths: z.array(z.string()).default([]),
  focusAreas: z.array(z.string()).default([]),
  attendancePct: z.number().int().min(0).max(100).default(0),
  /** Publishing is what makes it visible to the parent. */
  publish: z.boolean().optional(),
});

export const publishReportSchema = z.object({ publish: z.boolean() });

export const createMilestoneSchema = z.object({
  studentId: z.string().min(1),
  label: z.string().min(1),
  skill: skill.default("cognitive"),
  achievedOn: z.iso.datetime().or(dateKeyString),
  note: z.string().default(""),
  emoji: z.string().default("⭐"),
});

export type CreateLessonInput = z.infer<typeof createLessonSchema>;
export type UpsertReportInput = z.infer<typeof upsertReportSchema>;
export type CreateMilestoneInput = z.infer<typeof createMilestoneSchema>;
