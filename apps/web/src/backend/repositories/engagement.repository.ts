/** Events and the admissions pipeline. */
import { prisma, type Prisma } from "@/backend/database/client";

export const eventInclude = { rsvps: true } satisfies Prisma.SchoolEventInclude;
export const inquiryInclude = {
  notes: { orderBy: { createdAt: "asc" } },
} satisfies Prisma.InquiryInclude;

export const engagementRepository = {
  // --------------------------------------------------------------- events
  listEvents(where: Prisma.SchoolEventWhereInput) {
    return prisma.schoolEvent.findMany({
      where,
      include: eventInclude,
      orderBy: { startsAt: "desc" },
    });
  },
  findEvent(id: string) {
    return prisma.schoolEvent.findUnique({ where: { id }, include: eventInclude });
  },
  findEventBySlug(slug: string) {
    return prisma.schoolEvent.findUnique({ where: { slug }, include: eventInclude });
  },
  createEvent(data: Prisma.SchoolEventUncheckedCreateInput) {
    return prisma.schoolEvent.create({ data, include: eventInclude });
  },
  updateEvent(id: string, data: Prisma.SchoolEventUncheckedUpdateInput) {
    return prisma.schoolEvent.update({ where: { id }, data, include: eventInclude });
  },
  deleteEvent(id: string) {
    return prisma.schoolEvent.delete({ where: { id } });
  },
  upsertRsvp(eventId: string, userId: string, name: string, guests: number) {
    return prisma.eventRsvp.upsert({
      where: { eventId_userId: { eventId, userId } },
      update: { name, guests },
      create: { eventId, userId, name, guests },
    });
  },
  deleteRsvp(eventId: string, userId: string) {
    return prisma.eventRsvp.deleteMany({ where: { eventId, userId } });
  },

  // ----------------------------------------------------------- admissions
  listInquiries(where: Prisma.InquiryWhereInput) {
    return prisma.inquiry.findMany({
      where,
      include: inquiryInclude,
      orderBy: { createdAt: "desc" },
    });
  },
  findInquiry(id: string) {
    return prisma.inquiry.findUnique({ where: { id }, include: inquiryInclude });
  },
  createInquiry(data: Prisma.InquiryUncheckedCreateInput) {
    return prisma.inquiry.create({ data, include: inquiryInclude });
  },
  updateInquiry(id: string, data: Prisma.InquiryUncheckedUpdateInput) {
    return prisma.inquiry.update({ where: { id }, data, include: inquiryInclude });
  },
  addInquiryNote(inquiryId: string, body: string, author: string) {
    return prisma.inquiryNote.create({ data: { inquiryId, body, author } });
  },

  listApplications(where: Prisma.ApplicationWhereInput) {
    return prisma.application.findMany({ where, orderBy: { submittedOn: "desc" } });
  },
  findApplication(id: string) {
    return prisma.application.findUnique({ where: { id } });
  },
  createApplication(data: Prisma.ApplicationUncheckedCreateInput) {
    return prisma.application.create({ data });
  },
  updateApplication(id: string, data: Prisma.ApplicationUncheckedUpdateInput) {
    return prisma.application.update({ where: { id }, data });
  },
  async nextApplicationNo(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `APP/${year}/`;
    const rows = await prisma.$queryRaw<{ max: number | null }[]>`
      SELECT MAX(CAST(split_part("applicationNo", '/', 3) AS INTEGER)) AS max
      FROM "Application"
      WHERE "applicationNo" LIKE ${`${prefix}%`}
        AND split_part("applicationNo", '/', 3) ~ '^[0-9]+$'
    `;
    return `${prefix}${String((rows[0]?.max ?? 0) + 1).padStart(4, "0")}`;
  },

  listVisits(where: Prisma.VisitBookingWhereInput) {
    return prisma.visitBooking.findMany({ where, orderBy: [{ date: "desc" }, { slot: "asc" }] });
  },
  createVisit(data: Prisma.VisitBookingUncheckedCreateInput) {
    return prisma.visitBooking.create({ data });
  },
  updateVisit(id: string, data: Prisma.VisitBookingUncheckedUpdateInput) {
    return prisma.visitBooking.update({ where: { id }, data });
  },
  findVisitSlot(branchId: string, date: string, slot: string) {
    return prisma.visitBooking.findUnique({
      where: { branchId_date_slot: { branchId, date, slot } },
    });
  },
  bookedSlotsOn(branchId: string, date: string) {
    return prisma.visitBooking.findMany({
      where: { branchId, date, status: { not: "CANCELLED" } },
      select: { slot: true },
    });
  },

  /** Seats: capacity per classroom of a program, minus who is in them. */
  async seatAvailability(branchId?: string) {
    const classrooms = await prisma.classroom.findMany({
      where: branchId ? { branchId } : {},
      select: {
        id: true,
        name: true,
        branchId: true,
        programSlug: true,
        capacity: true,
        _count: { select: { students: { where: { status: "ACTIVE" } } } },
      },
    });
    return classrooms.map((c) => ({
      classroomId: c.id,
      classroomName: c.name,
      branchId: c.branchId,
      programSlug: c.programSlug,
      capacity: c.capacity,
      enrolled: c._count.students,
      available: Math.max(0, c.capacity - c._count.students),
    }));
  },
};
