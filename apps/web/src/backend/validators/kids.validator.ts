import { z } from "zod";

export const finishGameSchema = z.object({
  studentId: z.string().min(1),
  gameSlug: z.string().min(1),
  score: z.number().int().min(0).max(100000),
  /** A request, not a grant: the service caps this at the game's maxStars. */
  stars: z.number().int().min(0).max(10),
  durationSec: z.number().int().min(0).max(7200),
});

export const finishStorySchema = z.object({
  studentId: z.string().min(1),
  storyId: z.string().min(1),
});

export const mascotSchema = z.object({
  studentId: z.string().min(1),
  mascot: z.enum(["kiki", "dodo", "mimi"]),
});

export const artworkSchema = z.object({
  studentId: z.string().min(1),
  title: z.string().max(120).default("My drawing"),
  // A canvas PNG. Capped so a child cannot fill the database with one drawing;
  // real uploads go through the media pipeline instead.
  dataUrl: z
    .string()
    .max(2_000_000)
    .regex(/^data:image\/(png|jpeg);base64,/, "Expected a PNG or JPEG data URL"),
});
