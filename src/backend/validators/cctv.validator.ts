import { z } from "zod";

export const createCameraSchema = z.object({
  name: z.string().min(2),
  branchId: z.string().min(1),
  classroomId: z.string().min(1).optional(),
  // MediaMTX path this feed publishes at (lowercase, url-safe).
  streamPath: z
    .string()
    .min(1)
    .regex(/^[a-z0-9][a-z0-9_-]*$/, "Use lowercase letters, numbers, - or _"),
  rtspUrl: z.string().min(1),
  parentViewable: z.boolean().optional().default(true),
});

export const viewTokenRequestSchema = z.object({
  cameraId: z.string().min(1),
});

export type CreateCameraInput = z.infer<typeof createCameraSchema>;
