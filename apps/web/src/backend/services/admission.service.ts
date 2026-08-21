/**
 * Events, RSVPs and the admissions pipeline (SoW §7.5, §7.11).
 *
 * Admissions is the one place strangers write to this system: the enquiry form
 * and the visit booker are open to the public site. So everything that arrives
 * from outside is treated as untrusted — the source is stamped server-side, the
 * stage always starts at NEW, and a visit slot is taken atomically so two
 * families cannot book the same 11:00 on Saturday.
 */
import { type Prisma } from "@/backend/database/client";
import { engagementRepository } from "@/backend/repositories/engagement.repository";
import { toApplication, toEvent, toInquiry, toVisitBooking } from "@/backend/mappers";
import { AppError, ForbiddenError, NotFoundError } from "@/backend/utils/error-handler.util";
import { requireRole } from "@/backend/utils/rbac.util";
import { type Scope } from "@/backend/utils/scope.util";
import { ROLES, type Role } from "@/shared/constants/roles";
import type { Application, Inquiry, SchoolEvent, VisitBooking } from "@/shared/types/engagement.types";
import type {
  CreateApplicationInput,
  CreateEventInput,
  CreateInquiryInput,
  CreateVisitInput,
  UpdateEventInput,
} from "@/backend/validators/admission.validator";

const ADMINS: Role[] = [ROLES.SUPER_ADMIN, ROLES.ADMIN];

/** Half-hour slots, 10:00–16:00, matching the visit booker's grid. */
export const VISIT_SLOTS = [
  "10:00", "10:30", "11:00", "11:30", "12:00", "12:30",
  "14:00", "14:30", "15:00", "15:30", "16:00",
];

export const admissionService = {
  // --------------------------------------------------------------- events
  async listEvents(scope: Scope | null): Promise<SchoolEvent[]> {
    // No session: the public events page, published only.
    if (!scope) return (await engagementRepository.listEvents({ published: true })).map(toEvent);
    const where: Prisma.SchoolEventWhereInput =
      scope.role === ROLES.SUPER_ADMIN || scope.role === ROLES.ADMIN
        ? scope.branchId
          ? { OR: [{ branchId: scope.branchId }, { branchId: null }] }
          : {}
        : { published: true };
    return (await engagementRepository.listEvents(where)).map(toEvent);
  },

  async getEvent(slug: string): Promise<SchoolEvent> {
    const row = await engagementRepository.findEventBySlug(slug);
    if (!row) throw new NotFoundError("Event not found");
    return toEvent(row);
  },

  async createEvent(scope: Scope, input: CreateEventInput): Promise<SchoolEvent> {
    requireRole(scope.role, ADMINS);
    const { media, ...rest } = input;
    const row = await engagementRepository.createEvent({
      ...rest,
      branchId: rest.branchId ?? scope.branchId,
      startsAt: new Date(rest.startsAt),
      endsAt: new Date(rest.endsAt),
      media: media as Prisma.InputJsonValue,
    });
    return toEvent(row);
  },

  async updateEvent(scope: Scope, id: string, input: UpdateEventInput): Promise<SchoolEvent> {
    requireRole(scope.role, ADMINS);
    const { media, startsAt, endsAt, ...rest } = input;
    const row = await engagementRepository.updateEvent(id, {
      ...rest,
      ...(startsAt ? { startsAt: new Date(startsAt) } : {}),
      ...(endsAt ? { endsAt: new Date(endsAt) } : {}),
      ...(media ? { media: media as Prisma.InputJsonValue } : {}),
    });
    return toEvent(row);
  },

  async deleteEvent(scope: Scope, id: string): Promise<void> {
    requireRole(scope.role, ADMINS);
    await engagementRepository.deleteEvent(id);
  },

  async rsvp(scope: Scope, eventId: string, guests: number): Promise<SchoolEvent> {
    const event = await engagementRepository.findEvent(eventId);
    if (!event) throw new NotFoundError("Event not found");
    if (!event.published) throw new ForbiddenError("That event is not open yet");
    if (!event.rsvpEnabled) throw new AppError("This event does not take RSVPs", 409, "rsvp_closed");
    await engagementRepository.upsertRsvp(eventId, scope.userId, scope.name, guests);
    return toEvent((await engagementRepository.findEvent(eventId))!);
  },

  async cancelRsvp(scope: Scope, eventId: string): Promise<SchoolEvent> {
    await engagementRepository.deleteRsvp(eventId, scope.userId);
    const row = await engagementRepository.findEvent(eventId);
    if (!row) throw new NotFoundError("Event not found");
    return toEvent(row);
  },

  // ------------------------------------------------------------ enquiries
  async listInquiries(scope: Scope): Promise<Inquiry[]> {
    requireRole(scope.role, ADMINS);
    const where = scope.branchId && scope.role !== ROLES.SUPER_ADMIN ? { branchId: scope.branchId } : {};
    return (await engagementRepository.listInquiries(where)).map(toInquiry);
  },

  /**
   * Public. Anyone on the website can submit this, so the stage and source are
   * decided here rather than accepted from the body.
   */
  async createInquiry(input: CreateInquiryInput, source: Inquiry["source"] = "WEBSITE"): Promise<Inquiry> {
    const { childDob, ...rest } = input;
    const row = await engagementRepository.createInquiry({
      ...rest,
      childDob: childDob ? new Date(childDob) : null,
      source,
      stage: "NEW",
    });
    return toInquiry(row);
  },

  async moveInquiry(scope: Scope, id: string, stage: Inquiry["stage"]): Promise<Inquiry> {
    requireRole(scope.role, ADMINS);
    return toInquiry(await engagementRepository.updateInquiry(id, { stage }));
  },

  async assignInquiry(scope: Scope, id: string, staffId: string | null): Promise<Inquiry> {
    requireRole(scope.role, ADMINS);
    return toInquiry(await engagementRepository.updateInquiry(id, { assignedToStaffId: staffId }));
  },

  async addInquiryNote(scope: Scope, id: string, body: string): Promise<Inquiry> {
    requireRole(scope.role, ADMINS);
    await engagementRepository.addInquiryNote(id, body, scope.name);
    const row = await engagementRepository.findInquiry(id);
    if (!row) throw new NotFoundError("Enquiry not found");
    return toInquiry(row);
  },

  async deleteInquiry(scope: Scope, id: string): Promise<void> {
    requireRole(scope.role, ADMINS);
    await engagementRepository.deleteInquiry(id);
  },

  // --------------------------------------------------------- applications
  async listApplications(scope: Scope): Promise<Application[]> {
    requireRole(scope.role, ADMINS);
    const where = scope.branchId && scope.role !== ROLES.SUPER_ADMIN ? { branchId: scope.branchId } : {};
    return (await engagementRepository.listApplications(where)).map(toApplication);
  },

  /** Public: the /admissions/apply form. */
  async createApplication(input: CreateApplicationInput): Promise<Application> {
    const row = await engagementRepository.createApplication({
      ...input,
      childDob: new Date(input.childDob),
      applicationNo: await engagementRepository.nextApplicationNo(),
      status: "SUBMITTED",
      documents: input.documents as Prisma.InputJsonValue,
    });
    return toApplication(row);
  },

  async setApplicationStatus(
    scope: Scope,
    id: string,
    status: Application["status"],
    note?: string,
  ): Promise<Application> {
    requireRole(scope.role, ADMINS);
    const row = await engagementRepository.updateApplication(id, {
      status,
      ...(note === undefined ? {} : { decisionNote: note }),
    });
    return toApplication(row);
  },

  /** Tick a document off the checklist when it lands. */
  async toggleApplicationDoc(scope: Scope, id: string, docId: string): Promise<Application> {
    requireRole(scope.role, ADMINS);
    const existing = await engagementRepository.findApplication(id);
    if (!existing) throw new NotFoundError("Application not found");
    const docs = toApplication(existing).documents.map((d) =>
      d.id === docId ? { ...d, uploaded: !d.uploaded } : d,
    );
    const row = await engagementRepository.updateApplication(id, {
      documents: docs as unknown as Prisma.InputJsonValue,
      // Chasing paperwork is the commonest reason an application stalls; move
      // it on by itself once the last document is in.
      ...(docs.every((d) => d.uploaded) && existing.status === "DOCS_PENDING"
        ? { status: "UNDER_REVIEW" as const }
        : {}),
    });
    return toApplication(row);
  },

  // ---------------------------------------------------------------- visits
  async listVisits(scope: Scope): Promise<VisitBooking[]> {
    // Prospective families are an admissions matter, not a classroom one.
    requireRole(scope.role, ADMINS);
    const where = scope.branchId && scope.role !== ROLES.SUPER_ADMIN ? { branchId: scope.branchId } : {};
    return (await engagementRepository.listVisits(where)).map(toVisitBooking);
  },

  /** Which of the day's slots are still free — drives the booker's grid. */
  async slotsOn(branchId: string, date: string): Promise<{ slot: string; taken: boolean }[]> {
    const booked = new Set((await engagementRepository.bookedSlotsOn(branchId, date)).map((b) => b.slot));
    return VISIT_SLOTS.map((slot) => ({ slot, taken: booked.has(slot) }));
  },

  /** Public. The unique index on (branch, date, slot) is what makes it safe. */
  async bookVisit(input: CreateVisitInput): Promise<VisitBooking> {
    if (!VISIT_SLOTS.includes(input.slot)) {
      throw new AppError("That is not one of our visiting times", 422, "bad_slot");
    }
    try {
      return toVisitBooking(await engagementRepository.createVisit({ ...input, status: "REQUESTED" }));
    } catch {
      // The only way the insert fails is the unique slot index. That index does
      // not know about status, so a cancelled booking goes on holding its row
      // even though `slotsOn` rightly shows the slot as free again — leaving
      // the parent a slot the grid offers and the server always refuses.
      // Cancelling has to really give the time back, so the dead row is taken
      // over by whoever asks for it next.
      const held = await engagementRepository.findVisitSlot(input.branchId, input.date, input.slot);
      if (!held || held.status !== "CANCELLED") {
        throw new AppError("Someone just took that slot — please pick another", 409, "slot_taken");
      }
      return toVisitBooking(await engagementRepository.updateVisit(held.id, { ...input, status: "REQUESTED" }));
    }
  },

  async setVisitStatus(scope: Scope, id: string, status: VisitBooking["status"]): Promise<VisitBooking> {
    requireRole(scope.role, ADMINS);
    return toVisitBooking(await engagementRepository.updateVisit(id, { status }));
  },

  async seats(branchId?: string) {
    return engagementRepository.seatAvailability(branchId);
  },
};
