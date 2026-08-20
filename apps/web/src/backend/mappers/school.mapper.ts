import type {
  AttendanceRecord,
  Branch,
  Classroom,
  Guardian,
  PickupAuthorization,
  Program,
  ProgramSlug,
  Staff,
  Student,
  AccentColor,
} from "@/shared/types/school.types";
import type { Role } from "@/shared/constants/roles";
import type * as P from "@/backend/database/generated";
import { iso, isoOrNull } from "./index";

export function toBranch(b: P.Branch): Branch {
  return {
    id: b.id,
    name: b.name,
    code: b.code,
    address: b.address,
    city: b.city,
    pincode: b.pincode,
    phone: b.phone,
    email: b.email,
    active: b.active,
    opensAt: b.opensAt,
    closesAt: b.closesAt,
    capacity: b.capacity,
    createdAt: iso(b.createdAt),
    updatedAt: iso(b.updatedAt),
  };
}

export function toProgram(p: P.Program): Program {
  return {
    id: p.id,
    slug: p.slug as ProgramSlug,
    name: p.name,
    ageFrom: p.ageFrom,
    ageTo: p.ageTo,
    durationLabel: p.durationLabel,
    tagline: p.tagline,
    description: p.description,
    outcomes: p.outcomes,
    activities: p.activities,
    milestones: p.milestones,
    feePerTerm: p.feePerTerm,
    seatsPerBatch: p.seatsPerBatch,
    emoji: p.emoji,
    accent: p.accent as AccentColor,
  };
}

export function toClassroom(c: P.Classroom): Classroom {
  return {
    id: c.id,
    branchId: c.branchId,
    name: c.name,
    programSlug: c.programSlug as ProgramSlug,
    capacity: c.capacity,
    teacherId: c.teacherId,
    room: c.room,
    createdAt: iso(c.createdAt),
    updatedAt: iso(c.updatedAt),
  };
}

type StaffRow = P.Staff & { classrooms?: { classroomId: string }[] };

export function toStaff(s: StaffRow): Staff {
  return {
    id: s.id,
    branchId: s.branchId,
    name: s.name,
    email: s.email,
    phone: s.phone,
    role: s.role as Role,
    designation: s.designation,
    qualification: s.qualification,
    joinedOn: iso(s.joinedOn),
    status: s.status,
    classroomIds: (s.classrooms ?? []).map((c) => c.classroomId),
    photoEmoji: s.photoEmoji,
    salary: s.salary,
    createdAt: iso(s.createdAt),
    updatedAt: iso(s.updatedAt),
  };
}

type StudentRow = P.Student & {
  guardianships?: { guardianId: string; isPrimary: boolean; guardian?: { name: string } }[];
};

export function toStudent(s: StudentRow): Student {
  const links = s.guardianships ?? [];
  const primary = links.find((g) => g.isPrimary) ?? links[0];
  return {
    id: s.id,
    branchId: s.branchId,
    firstName: s.firstName,
    lastName: s.lastName,
    admissionNo: s.admissionNo,
    dob: iso(s.dob),
    gender: s.gender,
    classroomId: s.classroomId,
    programSlug: s.programSlug as ProgramSlug,
    status: s.status,
    enrolledOn: iso(s.enrolledOn),
    photoEmoji: s.photoEmoji,
    bloodGroup: s.bloodGroup,
    allergies: s.allergies,
    medicalNotes: s.medicalNotes,
    guardianIds: links.map((g) => g.guardianId),
    primaryGuardianName: primary?.guardian?.name,
    createdAt: iso(s.createdAt),
    updatedAt: iso(s.updatedAt),
  };
}

type GuardianRow = P.Guardian & { guardianships?: { studentId: string }[] };

export function toGuardian(g: GuardianRow): Guardian {
  return {
    id: g.id,
    name: g.name,
    email: g.email,
    phone: g.phone,
    relation: g.relation,
    occupation: g.occupation,
    address: g.address,
    userId: g.userId,
    studentIds: (g.guardianships ?? []).map((s) => s.studentId),
    canPickup: g.canPickup,
    isEmergencyContact: g.isEmergencyContact,
    createdAt: iso(g.createdAt),
    updatedAt: iso(g.updatedAt),
  };
}

export function toAttendance(a: P.AttendanceRecord): AttendanceRecord {
  return {
    id: a.id,
    studentId: a.studentId,
    classroomId: a.classroomId,
    date: a.date,
    status: a.status,
    checkInAt: isoOrNull(a.checkInAt),
    checkOutAt: isoOrNull(a.checkOutAt),
    pickedUpBy: a.pickedUpBy,
    markedByStaffId: a.markedByStaffId,
    note: a.note,
    mood: a.mood,
    mealsEaten: a.mealsEaten,
    napMinutes: a.napMinutes,
    createdAt: iso(a.createdAt),
    updatedAt: iso(a.updatedAt),
  };
}

export function toPickupAuthorization(p: P.PickupAuthorization): PickupAuthorization {
  return {
    id: p.id,
    studentId: p.studentId,
    personName: p.personName,
    relation: p.relation,
    phone: p.phone,
    code: p.code,
    validOn: p.validOn,
    used: p.used,
    createdByUserId: p.createdByUserId,
    createdAt: iso(p.createdAt),
  };
}
