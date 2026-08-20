/**
 * Seeds the demo school into Postgres from `@climbkiddo/shared/fixtures` — the
 * same dataset the UI has been running on. Nothing here is invented: if a
 * record looks odd, the fixture is where it comes from.
 *
 * Two id conventions make the fixtures' cross-references survive the trip:
 *
 *  * A staff member's login `User` gets the *staff* id (`st_meera`), because
 *    conversations and messages address staff by that id.
 *  * A guardian's login `User` gets `guardian.userId` when the fixture names one
 *    (`gd_aarav` -> `usr_parent`) and otherwise the *guardian* id, because
 *    conversations address parents both ways.
 *
 * Re-running is safe: every table is cleared first, in FK order.
 *
 * Run with `npm run db:seed`.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { type Prisma, PrismaClient } from "./generated";
import {
  ACTIVITIES,
  APPLICATIONS,
  ATTENDANCE,
  AUDIT_ENTRIES,
  BADGES,
  BANNERS,
  BLOG_POSTS,
  BRANCHES,
  CLASSROOMS,
  CMS_PAGES,
  CONVERSATIONS,
  CURRICULUM,
  DEVICE_TOKENS,
  EMERGENCY_CONTACTS,
  EVENTS,
  FEE_STRUCTURES,
  GAMES,
  GUARDIANS,
  INQUIRIES,
  INVOICES,
  JOURNEY,
  LESSONS,
  MEDIA_ASSETS,
  MEDICAL_PROFILES,
  MEETINGS,
  MESSAGES,
  MILESTONES,
  NOTICES,
  NOTIFICATION_PREFERENCE,
  NOTIFICATIONS,
  PAYMENTS,
  PROGRAMS,
  PROGRESS_REPORTS,
  ROLE_DEFINITIONS,
  SAFETY_BROADCASTS,
  SCHOOL_SETTINGS,
  STAFF,
  STORIES,
  STUDENTS,
  TESTIMONIALS,
  VISIT_BOOKINGS,
} from "@climbkiddo/shared/fixtures";

const url =
  process.env.DATABASE_URL ??
  "postgresql://playschool:playschool@localhost:5432/playschool";
const prisma = new PrismaClient({ adapter: new PrismaPg(url) });

const DEMO_PASSWORD = "password12345";

/** Branch ids are `br_<slug>`; the slug is what infra/CCTV config keys off. */
const slugOf = (branchId: string) => branchId.replace(/^br_/, "");
const d = (iso: string | null | undefined) => (iso ? new Date(iso) : null);
const dReq = (iso: string) => new Date(iso);

/**
 * Value objects (media refs, checklists, story pages) go into `Json` columns.
 * Prisma's InputJsonValue wants an index signature that our precise shared
 * types deliberately don't have, so this is the one cast the seed needs.
 */
const json = (v: unknown) => v as Prisma.InputJsonValue;

/** Fixture ids that stand for "a person who can log in". */
const principalUserId = new Map<string, string>();

async function wipe() {
  // Children first. Cascades would cover most of this, but being explicit means
  // a half-renamed model fails loudly here instead of leaving orphans behind.
  await prisma.$transaction([
    prisma.cctvViewLog.deleteMany(),
    prisma.cameraAccessGrant.deleteMany(),
    prisma.camera.deleteMany(),
    prisma.schoolHours.deleteMany(),
    prisma.broadcastAck.deleteMany(),
    prisma.safetyBroadcast.deleteMany(),
    prisma.emergencyContact.deleteMany(),
    prisma.medicalProfile.deleteMany(),
    prisma.deviceToken.deleteMany(),
    prisma.notificationPreference.deleteMany(),
    prisma.appNotification.deleteMany(),
    prisma.auditEntry.deleteMany(),
    prisma.roleDefinition.deleteMany(),
    prisma.schoolSettings.deleteMany(),
    prisma.testimonial.deleteMany(),
    prisma.mediaAsset.deleteMany(),
    prisma.banner.deleteMany(),
    prisma.blogPost.deleteMany(),
    prisma.cmsPage.deleteMany(),
    prisma.artwork.deleteMany(),
    prisma.journeyState.deleteMany(),
    prisma.gameSession.deleteMany(),
    prisma.badge.deleteMany(),
    prisma.story.deleteMany(),
    prisma.game.deleteMany(),
    prisma.milestone.deleteMany(),
    prisma.progressReport.deleteMany(),
    prisma.curriculumUnit.deleteMany(),
    prisma.lesson.deleteMany(),
    prisma.visitBooking.deleteMany(),
    prisma.application.deleteMany(),
    prisma.inquiryNote.deleteMany(),
    prisma.inquiry.deleteMany(),
    prisma.eventRsvp.deleteMany(),
    prisma.schoolEvent.deleteMany(),
    prisma.installment.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.invoiceLine.deleteMany(),
    prisma.invoice.deleteMany(),
    prisma.feeStructure.deleteMany(),
    prisma.meeting.deleteMany(),
    prisma.message.deleteMany(),
    prisma.conversationMember.deleteMany(),
    prisma.conversation.deleteMany(),
    prisma.noticeRead.deleteMany(),
    prisma.notice.deleteMany(),
    prisma.activityReaction.deleteMany(),
    prisma.activityComment.deleteMany(),
    prisma.activityTag.deleteMany(),
    prisma.activity.deleteMany(),
    prisma.pickupAuthorization.deleteMany(),
    prisma.attendanceRecord.deleteMany(),
    prisma.guardianship.deleteMany(),
    prisma.guardian.deleteMany(),
    prisma.student.deleteMany(),
    prisma.staffClassroom.deleteMany(),
    prisma.classroom.deleteMany(),
    prisma.staff.deleteMany(),
    prisma.program.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.user.deleteMany(),
    prisma.branch.deleteMany(),
  ]);
}

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  await wipe();

  // ---------------------------------------------------------------- structure
  await prisma.branch.createMany({
    data: BRANCHES.map((b) => ({
      id: b.id,
      name: b.name,
      slug: slugOf(b.id),
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
      createdAt: dReq(b.createdAt),
    })),
  });

  // A deliberately wide live-viewing window (06:00–22:00 daily) so the CCTV
  // demo shows "live now" at most hours while still exercising the time gate.
  await prisma.schoolHours.createMany({
    data: BRANCHES.flatMap((b) =>
      Array.from({ length: 7 }, (_, dow) => ({
        branchId: b.id,
        dayOfWeek: dow,
        openMin: 6 * 60,
        closeMin: 22 * 60,
      })),
    ),
  });

  await prisma.program.createMany({
    data: PROGRAMS.map((p) => ({
      id: p.id,
      slug: p.slug,
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
      accent: p.accent,
    })),
  });

  // ------------------------------------------------------------------- staff
  await prisma.user.createMany({
    data: STAFF.map((s) => ({
      id: s.id,
      email: s.email,
      passwordHash,
      name: s.name,
      phone: s.phone,
      role: s.role,
      active: s.status === "ACTIVE",
      branchId: s.branchId,
      createdAt: dReq(s.createdAt),
    })),
  });
  for (const s of STAFF) principalUserId.set(s.id, s.id);

  await prisma.staff.createMany({
    data: STAFF.map((s) => ({
      id: s.id,
      userId: s.id,
      branchId: s.branchId,
      name: s.name,
      email: s.email,
      phone: s.phone,
      role: s.role,
      designation: s.designation,
      qualification: s.qualification,
      joinedOn: dReq(s.joinedOn),
      status: s.status,
      photoEmoji: s.photoEmoji,
      salary: s.salary,
      createdAt: dReq(s.createdAt),
    })),
  });

  await prisma.classroom.createMany({
    data: CLASSROOMS.map((c) => ({
      id: c.id,
      name: c.name,
      branchId: c.branchId,
      programSlug: c.programSlug,
      capacity: c.capacity,
      teacherId: c.teacherId,
      room: c.room,
      createdAt: dReq(c.createdAt),
    })),
  });

  await prisma.staffClassroom.createMany({
    data: STAFF.flatMap((s) =>
      s.classroomIds.map((classroomId) => ({ staffId: s.id, classroomId })),
    ),
    skipDuplicates: true,
  });

  // --------------------------------------------------------- children & kin
  await prisma.student.createMany({
    data: STUDENTS.map((s) => ({
      id: s.id,
      firstName: s.firstName,
      lastName: s.lastName,
      admissionNo: s.admissionNo,
      dob: dReq(s.dob),
      gender: s.gender,
      branchId: s.branchId,
      classroomId: s.classroomId,
      programSlug: s.programSlug,
      status: s.status,
      enrolledOn: dReq(s.enrolledOn),
      photoEmoji: s.photoEmoji,
      bloodGroup: s.bloodGroup,
      allergies: s.allergies,
      medicalNotes: s.medicalNotes,
      createdAt: dReq(s.createdAt),
    })),
  });

  // Every guardian gets a portal login — in a real school each parent has one,
  // and it makes all 24 families testable rather than just the demo family.
  for (const g of GUARDIANS) principalUserId.set(g.id, g.userId ?? g.id);

  await prisma.user.createMany({
    data: GUARDIANS.map((g) => ({
      id: principalUserId.get(g.id)!,
      email: g.email,
      passwordHash,
      name: g.name,
      phone: g.phone,
      role: "PARENT" as const,
      branchId: null,
      createdAt: dReq(g.createdAt),
    })),
  });

  await prisma.guardian.createMany({
    data: GUARDIANS.map((g) => ({
      id: g.id,
      userId: principalUserId.get(g.id)!,
      name: g.name,
      email: g.email,
      phone: g.phone,
      relation: g.relation,
      occupation: g.occupation,
      address: g.address,
      canPickup: g.canPickup,
      isEmergencyContact: g.isEmergencyContact,
      createdAt: dReq(g.createdAt),
    })),
  });

  await prisma.guardianship.createMany({
    data: GUARDIANS.flatMap((g) =>
      g.studentIds.map((studentId, i) => ({
        guardianId: g.id,
        studentId,
        isPrimary: i === 0,
      })),
    ),
    skipDuplicates: true,
  });

  // --------------------------------------------------------------- attendance
  await prisma.attendanceRecord.createMany({
    data: ATTENDANCE.map((a) => ({
      id: a.id,
      studentId: a.studentId,
      classroomId: a.classroomId,
      date: a.date,
      status: a.status,
      checkInAt: d(a.checkInAt),
      checkOutAt: d(a.checkOutAt),
      pickedUpBy: a.pickedUpBy,
      markedByStaffId: a.markedByStaffId,
      note: a.note,
      mood: a.mood,
      mealsEaten: a.mealsEaten,
      napMinutes: a.napMinutes,
      createdAt: dReq(a.createdAt),
    })),
    skipDuplicates: true,
  });

  // ------------------------------------------------------------ activity feed
  const staffByName = new Map(STAFF.map((s) => [s.name, s.id]));
  const guardianByName = new Map(GUARDIANS.map((g) => [g.name, principalUserId.get(g.id)!]));

  await prisma.activity.createMany({
    data: ACTIVITIES.map((a) => ({
      id: a.id,
      classroomId: a.classroomId,
      authorStaffId: a.authorStaffId,
      kind: a.kind,
      title: a.title,
      body: a.body,
      media: json(a.media),
      published: a.published,
      internalNote: a.internalNote ?? "",
      createdAt: dReq(a.createdAt),
    })),
  });

  await prisma.activityTag.createMany({
    data: ACTIVITIES.flatMap((a) =>
      a.studentIds.map((studentId) => ({ activityId: a.id, studentId })),
    ),
    skipDuplicates: true,
  });

  await prisma.activityComment.createMany({
    data: ACTIVITIES.flatMap((a) =>
      a.comments.map((c) => ({
        id: c.id,
        activityId: a.id,
        // Fixture comments carry a display name, not an id — resolve it against
        // the people we just created, falling back to the post's author.
        authorId:
          (c.authorRole === "TEACHER"
            ? staffByName.get(c.authorName)
            : guardianByName.get(c.authorName)) ?? a.authorStaffId,
        authorName: c.authorName,
        authorRole: c.authorRole,
        body: c.body,
        createdAt: dReq(c.createdAt),
      })),
    ),
  });

  await prisma.activityReaction.createMany({
    data: ACTIVITIES.flatMap((a) =>
      a.reactions
        .map((id) => principalUserId.get(id) ?? id)
        .map((userId) => ({ activityId: a.id, userId })),
    ),
    skipDuplicates: true,
  });

  // ---------------------------------------------------------------- notices
  await prisma.notice.createMany({
    data: NOTICES.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      audience: n.audience,
      classroomId: n.classroomId,
      branchId: n.branchId,
      priority: n.priority,
      publishedAt: d(n.publishedAt),
      expiresAt: d(n.expiresAt),
      authorName: n.authorName,
      attachments: json(n.attachments),
      pinned: n.pinned,
      createdAt: dReq(n.createdAt),
    })),
  });

  await prisma.noticeRead.createMany({
    data: NOTICES.flatMap((n) =>
      n.readBy
        .map((id) => principalUserId.get(id) ?? id)
        .map((userId) => ({ noticeId: n.id, userId })),
    ),
    skipDuplicates: true,
  });

  // --------------------------------------------------------------- messaging
  await prisma.conversation.createMany({
    data: CONVERSATIONS.map((c) => ({
      id: c.id,
      studentId: c.studentId,
      parentName: c.parentName,
      teacherName: c.teacherName,
      subject: c.subject,
      lastMessageAt: dReq(c.lastMessageAt),
      lastMessagePreview: c.lastMessagePreview,
      unreadForParent: c.unreadForParent,
      unreadForTeacher: c.unreadForTeacher,
      archived: c.archived,
      createdAt: dReq(c.createdAt),
    })),
  });

  await prisma.conversationMember.createMany({
    data: CONVERSATIONS.flatMap((c) =>
      c.participantIds
        .map((id) => principalUserId.get(id) ?? id)
        .map((userId) => ({ conversationId: c.id, userId })),
    ),
    skipDuplicates: true,
  });

  await prisma.message.createMany({
    data: MESSAGES.map((m) => ({
      id: m.id,
      conversationId: m.conversationId,
      senderId: principalUserId.get(m.senderId) ?? m.senderId,
      senderName: m.senderName,
      senderRole: m.senderRole,
      kind: m.kind,
      body: m.body,
      durationSec: m.durationSec ?? null,
      attachment: m.attachment ? json(m.attachment) : undefined,
      readAt: d(m.readAt),
      createdAt: dReq(m.createdAt),
    })),
  });

  await prisma.meeting.createMany({
    data: MEETINGS.map((m) => ({
      id: m.id,
      studentId: m.studentId,
      teacherName: m.teacherName,
      parentName: m.parentName,
      mode: m.mode,
      scheduledFor: dReq(m.scheduledFor),
      durationMin: m.durationMin,
      agenda: m.agenda,
      status: m.status,
      joinUrl: m.joinUrl ?? null,
      createdAt: dReq(m.createdAt),
    })),
  });

  // -------------------------------------------------------------------- fees
  await prisma.feeStructure.createMany({
    data: FEE_STRUCTURES.map((f) => ({
      id: f.id,
      programSlug: f.programSlug,
      branchId: f.branchId,
      admissionFee: f.admissionFee,
      termFee: f.termFee,
      transportFee: f.transportFee,
      mealFee: f.mealFee,
      activityFee: f.activityFee,
      termsPerYear: f.termsPerYear,
      lateFeePerDay: f.lateFeePerDay,
      createdAt: dReq(f.createdAt),
    })),
    skipDuplicates: true,
  });

  await prisma.invoice.createMany({
    data: INVOICES.map((inv) => ({
      id: inv.id,
      number: inv.number,
      studentId: inv.studentId,
      studentName: inv.studentName,
      branchId: inv.branchId,
      term: inv.term,
      amount: inv.amount,
      paidAmount: inv.paidAmount,
      lateFee: inv.lateFee,
      dueOn: dReq(inv.dueOn),
      issuedOn: dReq(inv.issuedOn),
      status: inv.status,
      notes: inv.notes,
      createdAt: dReq(inv.createdAt),
    })),
    skipDuplicates: true,
  });

  await prisma.invoiceLine.createMany({
    data: INVOICES.flatMap((inv) =>
      inv.lines.map((l) => ({
        id: `${inv.id}_${l.id}`,
        invoiceId: inv.id,
        label: l.label,
        amount: l.amount,
        qty: l.qty,
      })),
    ),
  });

  await prisma.payment.createMany({
    data: PAYMENTS.map((p) => ({
      id: p.id,
      invoiceId: p.invoiceId,
      studentId: p.studentId,
      amount: p.amount,
      method: p.method,
      reference: p.reference,
      paidAt: dReq(p.paidAt),
      receiptNo: p.receiptNo,
      gatewayOrderId: p.gatewayOrderId ?? null,
      createdAt: dReq(p.createdAt),
    })),
    skipDuplicates: true,
  });

  // ------------------------------------------------------------------ events
  await prisma.schoolEvent.createMany({
    data: EVENTS.map((e) => ({
      id: e.id,
      slug: e.slug,
      title: e.title,
      description: e.description,
      kind: e.kind,
      startsAt: dReq(e.startsAt),
      endsAt: dReq(e.endsAt),
      venue: e.venue,
      branchId: e.branchId,
      coverEmoji: e.coverEmoji,
      media: json(e.media),
      rsvpEnabled: e.rsvpEnabled,
      published: e.published,
      createdAt: dReq(e.createdAt),
    })),
  });

  await prisma.eventRsvp.createMany({
    data: EVENTS.flatMap((e) =>
      e.rsvps.map((r) => ({
        eventId: e.id,
        userId: principalUserId.get(r.userId) ?? r.userId,
        name: r.name,
        guests: r.guests,
      })),
    ),
    skipDuplicates: true,
  });

  // -------------------------------------------------------------- admissions
  await prisma.inquiry.createMany({
    data: INQUIRIES.map((q) => ({
      id: q.id,
      parentName: q.parentName,
      email: q.email,
      phone: q.phone,
      childName: q.childName,
      childDob: dReq(q.childDob),
      programSlug: q.programSlug,
      branchId: q.branchId,
      source: q.source,
      stage: q.stage,
      message: q.message,
      assignedToStaffId: q.assignedToStaffId,
      followUpOn: d(q.followUpOn),
      createdAt: dReq(q.createdAt),
    })),
  });

  await prisma.inquiryNote.createMany({
    data: INQUIRIES.flatMap((q) =>
      q.notes.map((n) => ({
        id: n.id,
        inquiryId: q.id,
        body: n.body,
        author: n.author,
        createdAt: dReq(n.createdAt),
      })),
    ),
  });

  await prisma.application.createMany({
    data: APPLICATIONS.map((a) => ({
      id: a.id,
      inquiryId: a.inquiryId,
      applicationNo: a.applicationNo,
      childName: a.childName,
      childDob: dReq(a.childDob),
      programSlug: a.programSlug,
      branchId: a.branchId,
      parentName: a.parentName,
      email: a.email,
      phone: a.phone,
      address: a.address,
      status: a.status,
      documents: json(a.documents),
      submittedOn: dReq(a.submittedOn),
      decisionNote: a.decisionNote,
      createdAt: dReq(a.createdAt),
    })),
  });

  await prisma.visitBooking.createMany({
    data: VISIT_BOOKINGS.map((v) => ({
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
      createdAt: dReq(v.createdAt),
    })),
    skipDuplicates: true,
  });

  // ------------------------------------------------------ lessons & progress
  await prisma.lesson.createMany({
    data: LESSONS.map((l) => ({
      id: l.id,
      title: l.title,
      programSlug: l.programSlug,
      classroomId: l.classroomId,
      date: l.date,
      slot: l.slot,
      objective: l.objective,
      materials: l.materials,
      steps: l.steps,
      skillTags: l.skillTags,
      status: l.status,
      authorStaffId: l.authorStaffId,
      homework: l.homework,
      createdAt: dReq(l.createdAt),
    })),
  });

  await prisma.curriculumUnit.createMany({
    data: CURRICULUM.map((c) => ({
      id: c.id,
      programSlug: c.programSlug,
      term: c.term,
      title: c.title,
      focus: c.focus,
      weeks: c.weeks,
      outcomes: c.outcomes,
    })),
  });

  await prisma.progressReport.createMany({
    data: PROGRESS_REPORTS.map((r) => ({
      id: r.id,
      studentId: r.studentId,
      term: r.term,
      scores: json(r.scores),
      teacherRemark: r.teacherRemark,
      strengths: r.strengths,
      focusAreas: r.focusAreas,
      attendancePct: r.attendancePct,
      publishedAt: d(r.publishedAt),
      authorStaffId: r.authorStaffId,
      createdAt: dReq(r.createdAt),
    })),
    skipDuplicates: true,
  });

  await prisma.milestone.createMany({
    data: MILESTONES.map((m) => ({
      id: m.id,
      studentId: m.studentId,
      label: m.label,
      skill: m.skill,
      achievedOn: dReq(m.achievedOn),
      note: m.note,
      emoji: m.emoji,
      createdAt: dReq(m.createdAt),
    })),
  });

  // -------------------------------------------------------------- kids zone
  await prisma.game.createMany({
    data: GAMES.map((g) => ({
      slug: g.slug,
      title: g.title,
      tagline: g.tagline,
      ageTier: g.ageTier,
      engine: g.engine,
      emoji: g.emoji,
      accent: g.accent,
      skill: g.skill,
      maxStars: g.maxStars,
      instructions: g.instructions,
    })),
  });

  await prisma.story.createMany({
    data: STORIES.map((s) => ({
      id: s.id,
      title: s.title,
      moral: s.moral,
      ageTier: s.ageTier,
      emoji: s.emoji,
      accent: s.accent,
      minutes: s.minutes,
      pages: json(s.pages),
    })),
  });

  await prisma.badge.createMany({
    data: BADGES.map((b) => ({
      key: b.key,
      label: b.label,
      description: b.description,
      emoji: b.emoji,
      requiredStars: b.requiredStars,
    })),
  });

  await prisma.journeyState.create({
    data: {
      studentId: JOURNEY.studentId,
      stars: JOURNEY.stars,
      level: JOURNEY.level,
      streakDays: JOURNEY.streakDays,
      lastPlayedOn: JOURNEY.lastPlayedOn,
      unlockedBadges: JOURNEY.unlockedBadges,
      completedGames: JOURNEY.completedGames,
      finishedStories: JOURNEY.finishedStories,
      mascot: JOURNEY.mascot,
    },
  });

  // -------------------------------------------------------------------- CMS
  await prisma.cmsPage.createMany({
    data: CMS_PAGES.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      heroHeading: p.heroHeading,
      heroSub: p.heroSub,
      seoTitle: p.seoTitle,
      seoDescription: p.seoDescription,
      status: p.status,
      sections: json(p.sections),
      createdAt: dReq(p.createdAt),
    })),
  });

  await prisma.blogPost.createMany({
    data: BLOG_POSTS.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      body: p.body,
      category: p.category,
      tags: p.tags,
      author: p.author,
      coverEmoji: p.coverEmoji,
      readMinutes: p.readMinutes,
      status: p.status,
      publishedAt: d(p.publishedAt),
      views: p.views,
      createdAt: dReq(p.createdAt),
    })),
  });

  await prisma.banner.createMany({
    data: BANNERS.map((b) => ({
      id: b.id,
      title: b.title,
      subtitle: b.subtitle,
      ctaLabel: b.ctaLabel,
      ctaHref: b.ctaHref,
      accent: b.accent,
      active: b.active,
      startsOn: d(b.startsOn),
      endsOn: d(b.endsOn),
      createdAt: dReq(b.createdAt),
    })),
  });

  await prisma.mediaAsset.createMany({
    data: MEDIA_ASSETS.map((m) => ({
      id: m.id,
      label: m.label,
      kind: m.kind,
      category: m.category,
      sizeKb: m.sizeKb,
      emoji: m.emoji,
      url: m.url,
      usedOn: m.usedOn,
      createdAt: dReq(m.createdAt),
    })),
  });

  await prisma.testimonial.createMany({
    data: TESTIMONIALS.map((t) => ({
      id: t.id,
      parentName: t.parentName,
      childName: t.childName,
      relation: t.relation,
      rating: t.rating,
      quote: t.quote,
      emoji: t.emoji,
      videoUrl: t.videoUrl,
      published: t.published,
      createdAt: dReq(t.createdAt),
    })),
  });

  // ---------------------------------------------------- notifications & ops
  await prisma.appNotification.createMany({
    data: NOTIFICATIONS.map((n) => ({
      id: n.id,
      userId: principalUserId.get(n.userId) ?? n.userId,
      kind: n.kind,
      title: n.title,
      body: n.body,
      href: n.href,
      read: n.read,
      emoji: n.emoji,
      createdAt: dReq(n.createdAt),
    })),
  });

  await prisma.notificationPreference.create({
    data: {
      userId: principalUserId.get(NOTIFICATION_PREFERENCE.userId) ?? NOTIFICATION_PREFERENCE.userId,
      channels: json(NOTIFICATION_PREFERENCE.channels),
      mutedKinds: NOTIFICATION_PREFERENCE.mutedKinds,
      quietHours: NOTIFICATION_PREFERENCE.quietHours ? json(NOTIFICATION_PREFERENCE.quietHours) : undefined,
    },
  });

  await prisma.deviceToken.createMany({
    data: DEVICE_TOKENS.map((t) => ({
      id: t.id,
      userId: principalUserId.get(t.userId) ?? t.userId,
      platform: t.platform,
      label: t.label,
      lastSeenAt: dReq(t.lastSeenAt),
      createdAt: dReq(t.createdAt),
    })),
  });

  await prisma.emergencyContact.createMany({
    data: EMERGENCY_CONTACTS.map((c) => ({
      id: c.id,
      studentId: c.studentId,
      name: c.name,
      relation: c.relation,
      phone: c.phone,
      priority: c.priority,
      createdAt: dReq(c.createdAt),
    })),
  });

  await prisma.medicalProfile.createMany({
    data: MEDICAL_PROFILES.map((m) => ({
      studentId: m.studentId,
      bloodGroup: m.bloodGroup,
      allergies: m.allergies,
      conditions: m.conditions,
      medications: m.medications,
      doctorName: m.doctorName,
      doctorPhone: m.doctorPhone,
      insuranceNo: m.insuranceNo,
      notes: m.notes,
    })),
  });

  await prisma.safetyBroadcast.createMany({
    data: SAFETY_BROADCASTS.map((b) => ({
      id: b.id,
      title: b.title,
      body: b.body,
      severity: b.severity,
      branchId: b.branchId,
      sentByName: b.sentByName,
      createdAt: dReq(b.createdAt),
    })),
  });

  await prisma.broadcastAck.createMany({
    data: SAFETY_BROADCASTS.flatMap((b) =>
      b.acknowledgedBy
        .map((id) => principalUserId.get(id) ?? id)
        .map((userId) => ({ broadcastId: b.id, userId })),
    ),
    skipDuplicates: true,
  });

  await prisma.auditEntry.createMany({
    data: AUDIT_ENTRIES.map((a) => ({
      id: a.id,
      actorName: a.actorName,
      actorRole: a.actorRole,
      action: a.action,
      target: a.target,
      detail: a.detail,
      ip: a.ip,
      createdAt: dReq(a.createdAt),
    })),
  });

  await prisma.roleDefinition.createMany({
    data: ROLE_DEFINITIONS.map((r) => ({
      role: r.role,
      label: r.label,
      description: r.description,
      permissions: r.permissions,
      system: r.system,
    })),
  });

  await prisma.schoolSettings.create({
    data: {
      id: "singleton",
      schoolName: SCHOOL_SETTINGS.schoolName,
      tagline: SCHOOL_SETTINGS.tagline,
      supportEmail: SCHOOL_SETTINGS.supportEmail,
      supportPhone: SCHOOL_SETTINGS.supportPhone,
      whatsapp: SCHOOL_SETTINGS.whatsapp,
      address: SCHOOL_SETTINGS.address,
      academicYear: SCHOOL_SETTINGS.academicYear,
      currency: SCHOOL_SETTINGS.currency,
      timezone: SCHOOL_SETTINGS.timezone,
      locale: SCHOOL_SETTINGS.locale,
      features: json(SCHOOL_SETTINGS.features),
      seasonalTheme: SCHOOL_SETTINGS.seasonalTheme,
    },
  });

  // ------------------------------------------------------------------- CCTV
  // "classroom-a" is the path the docker-compose test stream publishes to, so
  // the toddler room is the one that shows live pixels with no hardware.
  await prisma.camera.createMany({
    data: [
      {
        name: "Sunshine — Toddler Room",
        branchId: "br_kathgola",
        classroomId: "cr_sunshine",
        streamPath: "classroom-a",
        rtspUrl: "rtsp://mediamtx:8554/classroom-a",
        enabled: true,
        parentViewable: true,
      },
      {
        name: "Rainbow — Nursery",
        branchId: "br_kathgola",
        classroomId: "cr_rainbow",
        streamPath: "classroom-b",
        rtspUrl: "rtsp://mediamtx:8554/classroom-b",
        enabled: true,
        parentViewable: true,
      },
      {
        // Staff-only by design: a shared outdoor space shows other people's
        // children, so it is never parent-viewable.
        name: "Playground (staff only)",
        branchId: "br_kathgola",
        classroomId: null,
        streamPath: "playground",
        rtspUrl: "rtsp://mediamtx:8554/playground",
        enabled: true,
        parentViewable: false,
      },
    ],
  });

  const counts = {
    branches: await prisma.branch.count(),
    users: await prisma.user.count(),
    staff: await prisma.staff.count(),
    students: await prisma.student.count(),
    guardians: await prisma.guardian.count(),
    attendance: await prisma.attendanceRecord.count(),
    activities: await prisma.activity.count(),
    invoices: await prisma.invoice.count(),
    messages: await prisma.message.count(),
    cameras: await prisma.camera.count(),
  };

  console.log("✅ Seed complete");
  console.table(counts);
  console.log(`   Admin   : admin@climbkiddo.in / ${DEMO_PASSWORD}`);
  console.log(`   Teacher : meera@climbkiddo.in / ${DEMO_PASSWORD}`);
  console.log(`   Parent  : parent@example.com / ${DEMO_PASSWORD}`);
  console.log("   (every guardian in the fixtures has a login — same password)");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
