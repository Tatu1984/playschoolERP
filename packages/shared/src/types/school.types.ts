import type { BranchScoped, Entity, ID, ISODate } from "./common.types";
import type { Role } from "../constants/roles";

// ---------------------------------------------------------------- structure

export interface Branch extends Entity {
  name: string;
  code: string;
  address: string;
  city: string;
  pincode: string;
  phone: string;
  email: string;
  active: boolean;
  /** Live-CCTV / portal window, 24h "HH:mm". */
  opensAt: string;
  closesAt: string;
  capacity: number;
}

export type ProgramSlug =
  | "toddlers"
  | "nursery"
  | "junior-kg"
  | "senior-kg"
  | "summer-camp"
  | "abacus"
  | "activity-club";

/** A static catalogue entry (not a mutable record — hence no timestamps). */
export interface Program {
  id: ID;
  slug: ProgramSlug;
  name: string;
  ageFrom: number;
  ageTo: number;
  durationLabel: string;
  tagline: string;
  description: string;
  outcomes: string[];
  activities: string[];
  milestones: string[];
  feePerTerm: number;
  seatsPerBatch: number;
  emoji: string;
  accent: AccentColor;
}

export type AccentColor = "red" | "orange" | "blue" | "green" | "magenta" | "navy";

export interface Classroom extends Entity, BranchScoped {
  name: string;
  programSlug: ProgramSlug;
  capacity: number;
  /** Staff id of the class teacher. */
  teacherId: ID | null;
  room: string;
}

// ---------------------------------------------------------------- people

export type StudentStatus = "ACTIVE" | "ON_LEAVE" | "GRADUATED" | "WITHDRAWN";

export interface Student extends Entity, BranchScoped {
  firstName: string;
  lastName: string;
  admissionNo: string;
  dob: ISODate;
  gender: "M" | "F" | "OTHER";
  classroomId: ID | null;
  programSlug: ProgramSlug;
  status: StudentStatus;
  enrolledOn: ISODate;
  photoEmoji: string;
  bloodGroup: string;
  allergies: string[];
  medicalNotes: string;
  guardianIds: ID[];
  /** Denormalised for fast list rendering; kept in sync by the store. */
  primaryGuardianName?: string;
}

export type GuardianRelation =
  | "MOTHER"
  | "FATHER"
  | "GRANDPARENT"
  | "UNCLE"
  | "AUNT"
  | "OTHER";

export interface Guardian extends Entity {
  name: string;
  email: string;
  phone: string;
  relation: GuardianRelation;
  occupation: string;
  address: string;
  /** Linked portal user (a PARENT-role user) when they have app access. */
  userId: ID | null;
  studentIds: ID[];
  canPickup: boolean;
  isEmergencyContact: boolean;
}

export type StaffStatus = "ACTIVE" | "ON_LEAVE" | "RESIGNED";

export interface Staff extends Entity, BranchScoped {
  name: string;
  email: string;
  phone: string;
  role: Role;
  designation: string;
  qualification: string;
  joinedOn: ISODate;
  status: StaffStatus;
  classroomIds: ID[];
  photoEmoji: string;
  salary: number;
}

// ---------------------------------------------------------------- attendance

export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "HALF_DAY" | "UNMARKED";

export interface AttendanceRecord extends Entity {
  studentId: ID;
  classroomId: ID;
  /** "YYYY-MM-DD" — one record per student per day. */
  date: string;
  status: AttendanceStatus;
  checkInAt: ISODate | null;
  checkOutAt: ISODate | null;
  /** Guardian id or free-text name of whoever collected the child. */
  pickedUpBy: string | null;
  markedByStaffId: ID | null;
  note: string;
  mood: ChildMood | null;
  mealsEaten: "ALL" | "MOST" | "SOME" | "NONE" | null;
  napMinutes: number | null;
}

export type ChildMood = "HAPPY" | "CALM" | "SLEEPY" | "FUSSY" | "UNWELL";

export interface PickupAuthorization extends Entity {
  studentId: ID;
  personName: string;
  relation: string;
  phone: string;
  /** Single-use QR/OTP code shown in the parent app. */
  code: string;
  validOn: string;
  used: boolean;
  createdByUserId: ID;
}
