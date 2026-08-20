import { z } from "zod";

const PROGRAM_SLUGS = [
  "toddlers",
  "nursery",
  "junior-kg",
  "senior-kg",
  "summer-camp",
  "abacus",
  "activity-club",
] as const;

export const programSlug = z.enum(PROGRAM_SLUGS);

/** "HH:mm", 24-hour. */
const timeOfDay = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Expected HH:mm");
/** "YYYY-MM-DD". */
export const dateKeyString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const createBranchSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2).max(16),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and dashes only")
    .optional(),
  address: z.string().default(""),
  city: z.string().default(""),
  pincode: z.string().default(""),
  phone: z.string().default(""),
  email: z.email().or(z.literal("")).default(""),
  opensAt: timeOfDay.default("08:00"),
  closesAt: timeOfDay.default("18:30"),
  capacity: z.number().int().min(0).default(0),
  timezone: z.string().default("Asia/Kolkata"),
});
export const updateBranchSchema = createBranchSchema.partial().extend({
  active: z.boolean().optional(),
});

export const createClassroomSchema = z.object({
  name: z.string().min(1),
  branchId: z.string().min(1),
  programSlug: programSlug,
  capacity: z.number().int().min(1).max(60).default(15),
  teacherId: z.string().nullable().default(null),
  room: z.string().default(""),
});
export const updateClassroomSchema = createClassroomSchema.partial();

export const createStaffSchema = z.object({
  name: z.string().min(2),
  email: z.email(),
  phone: z.string().default(""),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "TEACHER"]),
  branchId: z.string().min(1),
  designation: z.string().default(""),
  qualification: z.string().default(""),
  joinedOn: z.iso.datetime().or(dateKeyString).optional(),
  status: z.enum(["ACTIVE", "ON_LEAVE", "RESIGNED"]).default("ACTIVE"),
  classroomIds: z.array(z.string()).default([]),
  photoEmoji: z.string().default("👩‍🏫"),
  salary: z.number().int().min(0).default(0),
  /** Optional: give this staff member a portal login straight away. */
  password: z.string().min(8).optional(),
});
export const updateStaffSchema = createStaffSchema.partial().omit({ password: true });

export const createStudentSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  admissionNo: z.string().min(1).optional(),
  dob: z.iso.datetime().or(dateKeyString),
  gender: z.enum(["M", "F", "OTHER"]).default("OTHER"),
  branchId: z.string().min(1),
  classroomId: z.string().nullable().default(null),
  programSlug: programSlug,
  status: z.enum(["ACTIVE", "ON_LEAVE", "GRADUATED", "WITHDRAWN"]).default("ACTIVE"),
  enrolledOn: z.iso.datetime().or(dateKeyString).optional(),
  photoEmoji: z.string().default("🧒"),
  bloodGroup: z.string().default(""),
  allergies: z.array(z.string()).default([]),
  medicalNotes: z.string().default(""),
  /** Enrol with a guardian in one call — the common admissions path. */
  guardian: z
    .object({
      name: z.string().min(2),
      email: z.email(),
      phone: z.string().default(""),
      relation: z
        .enum(["MOTHER", "FATHER", "GRANDPARENT", "UNCLE", "AUNT", "OTHER"])
        .default("OTHER"),
      occupation: z.string().default(""),
      address: z.string().default(""),
      /** Create a portal login for them too. */
      createLogin: z.boolean().default(true),
    })
    .optional(),
});
export const updateStudentSchema = createStudentSchema.partial().omit({ guardian: true });

export const createGuardianSchema = z.object({
  name: z.string().min(2),
  email: z.email(),
  phone: z.string().default(""),
  relation: z
    .enum(["MOTHER", "FATHER", "GRANDPARENT", "UNCLE", "AUNT", "OTHER"])
    .default("OTHER"),
  occupation: z.string().default(""),
  address: z.string().default(""),
  canPickup: z.boolean().default(true),
  isEmergencyContact: z.boolean().default(true),
  studentIds: z.array(z.string()).default([]),
  createLogin: z.boolean().default(false),
});
export const updateGuardianSchema = createGuardianSchema.partial().omit({ createLogin: true });

export type CreateBranchInput = z.infer<typeof createBranchSchema>;
export type UpdateBranchInput = z.infer<typeof updateBranchSchema>;
export type CreateClassroomInput = z.infer<typeof createClassroomSchema>;
export type UpdateClassroomInput = z.infer<typeof updateClassroomSchema>;
export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
export type CreateGuardianInput = z.infer<typeof createGuardianSchema>;
export type UpdateGuardianInput = z.infer<typeof updateGuardianSchema>;
