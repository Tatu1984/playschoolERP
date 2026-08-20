import { z } from "zod";
import { dateKeyString } from "./school.validator";

const status = z.enum(["PRESENT", "ABSENT", "LATE", "HALF_DAY", "UNMARKED"]);

export const markAttendanceSchema = z.object({
  studentId: z.string().min(1),
  classroomId: z.string().min(1),
  status,
  date: dateKeyString.optional(),
});

export const bulkMarkSchema = z.object({
  classroomId: z.string().min(1),
  status,
  date: dateKeyString.optional(),
});

export const checkInSchema = z.object({
  studentId: z.string().min(1),
  classroomId: z.string().min(1),
});

export const checkOutSchema = z.object({
  studentId: z.string().min(1),
  pickedUpBy: z.string().min(1),
  /** The single-use code from the parent app, when pickup is delegated. */
  code: z.string().length(6).optional(),
});

export const dayLogSchema = z.object({
  studentId: z.string().min(1),
  date: dateKeyString,
  note: z.string().optional(),
  mood: z.enum(["HAPPY", "CALM", "SLEEPY", "FUSSY", "UNWELL"]).nullable().optional(),
  mealsEaten: z.enum(["ALL", "MOST", "SOME", "NONE"]).nullable().optional(),
  napMinutes: z.number().int().min(0).max(600).nullable().optional(),
});

export const pickupAuthSchema = z.object({
  studentId: z.string().min(1),
  personName: z.string().min(2),
  relation: z.string().optional(),
  phone: z.string().optional(),
  validOn: dateKeyString.optional(),
});

export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>;
export type DayLogInput = z.infer<typeof dayLogSchema>;
