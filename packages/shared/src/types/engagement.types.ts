import type { Entity, ID, ISODate, MediaRef, Money } from "./common.types";
import type { ProgramSlug } from "./school.types";

// ---------------------------------------------------------------- activity feed

export type ActivityKind =
  | "LEARNING"
  | "PLAY"
  | "MEAL"
  | "NAP"
  | "ART"
  | "MUSIC"
  | "OUTDOOR"
  | "CELEBRATION";

export interface ActivityComment {
  id: ID;
  authorName: string;
  authorRole: "TEACHER" | "PARENT";
  body: string;
  createdAt: ISODate;
}

export interface Activity extends Entity {
  classroomId: ID;
  authorStaffId: ID;
  authorName: string;
  kind: ActivityKind;
  title: string;
  body: string;
  media: MediaRef[];
  /** Students tagged in the post — drives which parents see it. */
  studentIds: ID[];
  comments: ActivityComment[];
  /** userIds that reacted with a heart. */
  reactions: ID[];
  published: boolean;
  /** Teacher-only note not shown to parents. */
  internalNote?: string;
}

// ---------------------------------------------------------------- notices

export type NoticeAudience = "ALL" | "PARENTS" | "STAFF" | "CLASSROOM";
export type NoticePriority = "NORMAL" | "IMPORTANT" | "URGENT";

export interface Notice extends Entity {
  title: string;
  body: string;
  audience: NoticeAudience;
  classroomId: ID | null;
  branchId: ID | null;
  priority: NoticePriority;
  publishedAt: ISODate | null;
  expiresAt: ISODate | null;
  authorName: string;
  attachments: MediaRef[];
  /** userIds that have opened it. */
  readBy: ID[];
  pinned: boolean;
}

// ---------------------------------------------------------------- messaging

export type MessageKind = "TEXT" | "VOICE" | "FILE" | "SYSTEM";

export interface Message {
  id: ID;
  conversationId: ID;
  senderId: ID;
  senderName: string;
  senderRole: "TEACHER" | "PARENT" | "ADMIN";
  kind: MessageKind;
  body: string;
  /** Seconds, for VOICE messages. */
  durationSec?: number;
  attachment?: MediaRef;
  createdAt: ISODate;
  readAt: ISODate | null;
}

export interface Conversation extends Entity {
  /** Participant user ids. */
  participantIds: ID[];
  /** Display name shown to the *other* side. */
  parentName: string;
  teacherName: string;
  studentId: ID;
  subject: string;
  lastMessageAt: ISODate;
  lastMessagePreview: string;
  unreadForParent: number;
  unreadForTeacher: number;
  archived: boolean;
}

export type MeetingMode = "IN_PERSON" | "VIDEO" | "PHONE";
export type MeetingStatus = "REQUESTED" | "CONFIRMED" | "DECLINED" | "COMPLETED";

export interface Meeting extends Entity {
  studentId: ID;
  teacherName: string;
  parentName: string;
  mode: MeetingMode;
  scheduledFor: ISODate;
  durationMin: number;
  agenda: string;
  status: MeetingStatus;
  joinUrl?: string;
}

// ---------------------------------------------------------------- fees

export type InvoiceStatus = "DRAFT" | "SENT" | "PARTIAL" | "PAID" | "OVERDUE" | "CANCELLED";

export interface InvoiceLine {
  id: ID;
  label: string;
  amount: Money;
  qty: number;
}

export interface Invoice extends Entity {
  number: string;
  studentId: ID;
  studentName: string;
  branchId: ID;
  term: string;
  lines: InvoiceLine[];
  amount: Money;
  paidAmount: Money;
  lateFee: Money;
  dueOn: ISODate;
  status: InvoiceStatus;
  issuedOn: ISODate;
  notes: string;
}

export type PaymentMethod = "UPI" | "CARD" | "NETBANKING" | "CASH" | "CHEQUE";

export interface Payment extends Entity {
  invoiceId: ID;
  studentId: ID;
  amount: Money;
  method: PaymentMethod;
  reference: string;
  paidAt: ISODate;
  receiptNo: string;
  /** Gateway order id — Razorpay in production. */
  gatewayOrderId?: string;
}

export interface FeeStructure extends Entity {
  programSlug: ProgramSlug;
  branchId: ID;
  admissionFee: Money;
  termFee: Money;
  transportFee: Money;
  mealFee: Money;
  activityFee: Money;
  termsPerYear: number;
  lateFeePerDay: Money;
}

export interface Installment extends Entity {
  invoiceId: ID;
  dueOn: ISODate;
  amount: Money;
  paid: boolean;
}

// ---------------------------------------------------------------- events

export type EventKind =
  | "CELEBRATION"
  | "SPORTS"
  | "WORKSHOP"
  | "PTM"
  | "HOLIDAY"
  | "TRIP"
  | "COMPETITION";

export interface SchoolEvent extends Entity {
  slug: string;
  title: string;
  description: string;
  kind: EventKind;
  startsAt: ISODate;
  endsAt: ISODate;
  venue: string;
  branchId: ID | null;
  coverEmoji: string;
  media: MediaRef[];
  rsvpEnabled: boolean;
  /** userIds attending. */
  rsvps: { userId: ID; guests: number; name: string }[];
  published: boolean;
}

// ---------------------------------------------------------------- admissions

export type InquiryStage =
  | "NEW"
  | "CONTACTED"
  | "VISIT_SCHEDULED"
  | "APPLICATION"
  | "ENROLLED"
  | "LOST";

export type InquirySource = "WEBSITE" | "WALK_IN" | "REFERRAL" | "PHONE" | "SOCIAL" | "CAMPAIGN";

export interface Inquiry extends Entity {
  parentName: string;
  email: string;
  phone: string;
  childName: string;
  /** Null when the enquiry came in without one — a lead, not a form. */
  childDob: ISODate | null;
  programSlug: ProgramSlug;
  branchId: ID;
  source: InquirySource;
  stage: InquiryStage;
  message: string;
  assignedToStaffId: ID | null;
  followUpOn: ISODate | null;
  notes: { id: ID; body: string; createdAt: ISODate; author: string }[];
}

export type ApplicationStatus =
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "DOCS_PENDING"
  | "SEAT_OFFERED"
  | "ACCEPTED"
  | "REJECTED";

export interface Application extends Entity {
  inquiryId: ID | null;
  applicationNo: string;
  childName: string;
  childDob: ISODate;
  programSlug: ProgramSlug;
  branchId: ID;
  parentName: string;
  email: string;
  phone: string;
  address: string;
  status: ApplicationStatus;
  documents: { id: ID; label: string; uploaded: boolean; fileName?: string }[];
  submittedOn: ISODate;
  decisionNote: string;
}

export type BookingStatus = "REQUESTED" | "CONFIRMED" | "COMPLETED" | "CANCELLED";

export interface VisitBooking extends Entity {
  parentName: string;
  phone: string;
  email: string;
  branchId: ID;
  /** "YYYY-MM-DD" */
  date: string;
  /** "HH:mm" */
  slot: string;
  childAge: number;
  mode: "CAMPUS" | "VIDEO";
  status: BookingStatus;
  note: string;
}
