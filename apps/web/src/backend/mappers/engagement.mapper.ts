import type {
  Activity,
  Application,
  Conversation,
  FeeStructure,
  Inquiry,
  Invoice,
  Meeting,
  Message,
  Notice,
  Payment,
  SchoolEvent,
  VisitBooking,
} from "@/shared/types/engagement.types";
import type { MediaRef } from "@/shared/types/common.types";
import type { ProgramSlug } from "@/shared/types/school.types";
import type * as P from "@/backend/database/generated";
import { asJson, asMedia, iso, isoOrNull } from "./index";

// ---------------------------------------------------------------- feed

type ActivityRow = P.Activity & {
  author?: { name: string } | null;
  taggedStudents?: { studentId: string }[];
  comments?: P.ActivityComment[];
  reactions?: { userId: string }[];
};

/**
 * `forParent` strips the teacher-only note. Parents and staff hit the same
 * endpoint, so the flag is what keeps a staffroom aside out of a parent's feed.
 */
export function toActivity(a: ActivityRow, opts: { forParent?: boolean } = {}): Activity {
  return {
    id: a.id,
    classroomId: a.classroomId,
    authorStaffId: a.authorStaffId,
    authorName: a.author?.name ?? "",
    kind: a.kind,
    title: a.title,
    body: a.body,
    media: asMedia(a.media),
    studentIds: (a.taggedStudents ?? []).map((t) => t.studentId),
    comments: (a.comments ?? []).map((c) => ({
      id: c.id,
      authorName: c.authorName,
      authorRole: c.authorRole === "ADMIN" ? "TEACHER" : c.authorRole,
      body: c.body,
      createdAt: iso(c.createdAt),
    })),
    reactions: (a.reactions ?? []).map((r) => r.userId),
    published: a.published,
    ...(opts.forParent ? {} : { internalNote: a.internalNote }),
    createdAt: iso(a.createdAt),
    updatedAt: iso(a.updatedAt),
  };
}

// ---------------------------------------------------------------- notices

type NoticeRow = P.Notice & { reads?: { userId: string }[] };

export function toNotice(n: NoticeRow): Notice {
  return {
    id: n.id,
    title: n.title,
    body: n.body,
    audience: n.audience,
    classroomId: n.classroomId,
    branchId: n.branchId,
    priority: n.priority,
    publishedAt: isoOrNull(n.publishedAt),
    expiresAt: isoOrNull(n.expiresAt),
    authorName: n.authorName,
    attachments: asMedia(n.attachments),
    readBy: (n.reads ?? []).map((r) => r.userId),
    pinned: n.pinned,
    createdAt: iso(n.createdAt),
    updatedAt: iso(n.updatedAt),
  };
}

// ---------------------------------------------------------------- messaging

type ConversationRow = P.Conversation & { members?: { userId: string }[] };

export function toConversation(c: ConversationRow): Conversation {
  return {
    id: c.id,
    participantIds: (c.members ?? []).map((m) => m.userId),
    parentName: c.parentName,
    teacherName: c.teacherName,
    studentId: c.studentId,
    subject: c.subject,
    lastMessageAt: iso(c.lastMessageAt),
    lastMessagePreview: c.lastMessagePreview,
    unreadForParent: c.unreadForParent,
    unreadForTeacher: c.unreadForTeacher,
    archived: c.archived,
    createdAt: iso(c.createdAt),
    updatedAt: iso(c.updatedAt),
  };
}

export function toMessage(m: P.Message): Message {
  const attachment = m.attachment == null ? undefined : (m.attachment as unknown as MediaRef);
  return {
    id: m.id,
    conversationId: m.conversationId,
    senderId: m.senderId,
    senderName: m.senderName,
    senderRole: m.senderRole,
    kind: m.kind,
    body: m.body,
    ...(m.durationSec != null ? { durationSec: m.durationSec } : {}),
    ...(attachment ? { attachment } : {}),
    createdAt: iso(m.createdAt),
    readAt: isoOrNull(m.readAt),
  };
}

export function toMeeting(m: P.Meeting): Meeting {
  return {
    id: m.id,
    studentId: m.studentId,
    teacherName: m.teacherName,
    parentName: m.parentName,
    mode: m.mode,
    scheduledFor: iso(m.scheduledFor),
    durationMin: m.durationMin,
    agenda: m.agenda,
    status: m.status,
    ...(m.joinUrl ? { joinUrl: m.joinUrl } : {}),
    createdAt: iso(m.createdAt),
    updatedAt: iso(m.updatedAt),
  };
}

// ---------------------------------------------------------------- fees

export function toFeeStructure(f: P.FeeStructure): FeeStructure {
  return {
    id: f.id,
    programSlug: f.programSlug as ProgramSlug,
    branchId: f.branchId,
    admissionFee: f.admissionFee,
    termFee: f.termFee,
    transportFee: f.transportFee,
    mealFee: f.mealFee,
    activityFee: f.activityFee,
    termsPerYear: f.termsPerYear,
    lateFeePerDay: f.lateFeePerDay,
    createdAt: iso(f.createdAt),
    updatedAt: iso(f.updatedAt),
  };
}

type InvoiceRow = P.Invoice & { lines?: P.InvoiceLine[] };

export function toInvoice(inv: InvoiceRow): Invoice {
  return {
    id: inv.id,
    number: inv.number,
    studentId: inv.studentId,
    studentName: inv.studentName,
    branchId: inv.branchId,
    term: inv.term,
    lines: (inv.lines ?? []).map((l) => ({
      id: l.id,
      label: l.label,
      amount: l.amount,
      qty: l.qty,
    })),
    amount: inv.amount,
    paidAmount: inv.paidAmount,
    lateFee: inv.lateFee,
    dueOn: iso(inv.dueOn),
    status: inv.status,
    issuedOn: iso(inv.issuedOn),
    notes: inv.notes,
    createdAt: iso(inv.createdAt),
    updatedAt: iso(inv.updatedAt),
  };
}

export function toPayment(p: P.Payment): Payment {
  return {
    id: p.id,
    invoiceId: p.invoiceId,
    studentId: p.studentId,
    amount: p.amount,
    method: p.method,
    reference: p.reference,
    paidAt: iso(p.paidAt),
    receiptNo: p.receiptNo,
    ...(p.gatewayOrderId ? { gatewayOrderId: p.gatewayOrderId } : {}),
    createdAt: iso(p.createdAt),
  };
}

// ---------------------------------------------------------------- events

type EventRow = P.SchoolEvent & { rsvps?: P.EventRsvp[] };

export function toEvent(e: EventRow): SchoolEvent {
  return {
    id: e.id,
    slug: e.slug,
    title: e.title,
    description: e.description,
    kind: e.kind,
    startsAt: iso(e.startsAt),
    endsAt: iso(e.endsAt),
    venue: e.venue,
    branchId: e.branchId,
    coverEmoji: e.coverEmoji,
    media: asMedia(e.media),
    rsvpEnabled: e.rsvpEnabled,
    rsvps: (e.rsvps ?? []).map((r) => ({ userId: r.userId, guests: r.guests, name: r.name })),
    published: e.published,
    createdAt: iso(e.createdAt),
    updatedAt: iso(e.updatedAt),
  };
}

// ---------------------------------------------------------------- admissions

type InquiryRow = P.Inquiry & { notes?: P.InquiryNote[] };

export function toInquiry(q: InquiryRow): Inquiry {
  return {
    id: q.id,
    parentName: q.parentName,
    email: q.email,
    phone: q.phone,
    childName: q.childName,
    childDob: iso(q.childDob),
    programSlug: q.programSlug as ProgramSlug,
    branchId: q.branchId,
    source: q.source,
    stage: q.stage,
    message: q.message,
    assignedToStaffId: q.assignedToStaffId,
    followUpOn: isoOrNull(q.followUpOn),
    notes: (q.notes ?? []).map((n) => ({
      id: n.id,
      body: n.body,
      author: n.author,
      createdAt: iso(n.createdAt),
    })),
    createdAt: iso(q.createdAt),
    updatedAt: iso(q.updatedAt),
  };
}

export function toApplication(a: P.Application): Application {
  return {
    id: a.id,
    inquiryId: a.inquiryId,
    applicationNo: a.applicationNo,
    childName: a.childName,
    childDob: iso(a.childDob),
    programSlug: a.programSlug as ProgramSlug,
    branchId: a.branchId,
    parentName: a.parentName,
    email: a.email,
    phone: a.phone,
    address: a.address,
    status: a.status,
    documents: asJson<Application["documents"]>(a.documents, []),
    submittedOn: iso(a.submittedOn),
    decisionNote: a.decisionNote,
    createdAt: iso(a.createdAt),
    updatedAt: iso(a.updatedAt),
  };
}

export function toVisitBooking(v: P.VisitBooking): VisitBooking {
  return {
    id: v.id,
    parentName: v.parentName,
    phone: v.phone,
    email: v.email,
    branchId: v.branchId,
    date: v.date,
    slot: v.slot,
    childAge: v.childAge,
    mode: v.mode,
    status: v.status,
    note: v.note,
    createdAt: iso(v.createdAt),
    updatedAt: iso(v.updatedAt),
  };
}
