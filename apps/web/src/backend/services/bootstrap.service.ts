/**
 * One call that hands a signed-in portal everything it may see.
 *
 * The web portal renders fifty screens off a single client-side cache, so
 * making it issue fifty requests on load would be slower and no safer. This is
 * that cache's server side: the same role scoping as the individual endpoints,
 * assembled once.
 *
 * What a role may not see is not filtered out at the edge — it is never
 * fetched. A parent's bootstrap contains no staff records, no other family's
 * invoices, and no audit trail, because those queries do not run for them.
 *
 * The mobile app deliberately does NOT use this: it fetches per screen, since a
 * phone on a train should not wait for the whole school.
 */
import { feeService } from "./fee.service";
import { feedService } from "./feed.service";
import { attendanceService } from "./attendance.service";
import { admissionService } from "./admission.service";
import { messagingService } from "./messaging.service";
import { learningService } from "./learning.service";
import { schoolService } from "./school.service";
import { kidsService } from "./kids.service";
import { cmsService } from "./cms.service";
import { opsService } from "./ops.service";
import { analyticsService } from "./analytics.service";
import { auditService } from "./audit.service";
import { prisma } from "@/backend/database/client";
import { toMedicalProfile } from "@/backend/mappers";
import type { Scope } from "@/backend/utils/scope.util";
import { ROLES } from "@/shared/constants/roles";
import { logger } from "@/backend/utils/logger.util";
import type { Message } from "@/shared/types/engagement.types";

/**
 * How far back a portal load reaches.
 *
 * The snapshot used to ask for everything, which is fine against a seed of two
 * dozen children and untenable against a real school: attendance alone is
 * students × school days, so four hundred children over a year is eighty
 * thousand rows in one JSON payload, on every load, for ever. These are the
 * collections that grow with time rather than with the size of the school.
 *
 * A term is the working set. Someone looking further back is looking at
 * history, and history is what the per-resource endpoints are for — they take
 * the same filters and are already scoped the same way.
 */
const WINDOW_DAYS = 120;

/**
 * Backstops, in case a window is not enough on its own — a very large school,
 * or a chatty term. Hitting one is reported rather than passed off as the whole
 * set: a client that cannot tell a complete answer from a truncated one will
 * draw the truncated one as if it were complete.
 */
const CAP = {
  attendance: 20_000,
  messages: 2_000,
  invoices: 5_000,
  payments: 5_000,
  progressReports: 2_000,
  milestones: 5_000,
} as const;

/** What a snapshot actually covered, so the client is not left guessing. */
export interface SnapshotCoverage {
  /** Time-bounded collections contain nothing older than this. */
  since: string;
  /** Collections that hit their cap, and so are the newest N rather than all. */
  truncated: string[];
}

const EMPTY_ANALYTICS = {
  attendanceTrend: [],
  feeCollection: [],
  engagement: [],
  gameUsage: [],
  learningProgress: [],
  retention: [],
};

export const bootstrapService = {
  async snapshot(scope: Scope) {
    const isAdmin = scope.role === ROLES.SUPER_ADMIN || scope.role === ROLES.ADMIN;
    const isStaff = isAdmin || scope.role === ROLES.TEACHER;
    const isParent = scope.role === ROLES.PARENT;

    const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000);
    const sinceKey = since.toISOString().slice(0, 10);

    const [
      branches,
      classrooms,
      students,
      guardians,
      staff,
      attendance,
      pickupAuthorizations,
      activities,
      notices,
      conversations,
      meetings,
      feeStructures,
      invoices,
      payments,
      events,
      inquiries,
      applications,
      visitBookings,
      lessons,
      progressReports,
      milestones,
      cmsPages,
      blogPosts,
      banners,
      mediaAssets,
      testimonials,
      notifications,
      notificationPreference,
      devices,
      safetyBroadcasts,
      auditEntries,
      roleDefinitions,
      settings,
      analytics,
      journeys,
      gameSessions,
      artworks,
    ] = await Promise.all([
      schoolService.listBranches(scope),
      schoolService.listClassrooms(scope),
      schoolService.listStudents(scope),
      schoolService.listGuardians(scope),
      isStaff ? schoolService.listStaff(scope) : [],
      attendanceService.list(scope, { from: sinceKey }, CAP.attendance),
      attendanceService.listPickupAuths(scope),
      feedService.list(scope),
      feedService.listNotices(scope),
      messagingService.listConversations(scope),
      messagingService.listMeetings(scope),
      isParent || isAdmin ? feeService.listStructures(scope) : [],
      isParent || isAdmin ? feeService.listInvoices(scope, {}, CAP.invoices) : [],
      isParent || isAdmin ? feeService.listPayments(scope, undefined, CAP.payments) : [],
      admissionService.listEvents(scope),
      isAdmin ? admissionService.listInquiries(scope) : [],
      isAdmin ? admissionService.listApplications(scope) : [],
      isAdmin ? admissionService.listVisits(scope) : [],
      isStaff ? learningService.listLessons(scope) : [],
      learningService.listReports(scope, undefined, CAP.progressReports),
      learningService.listMilestones(scope, undefined, CAP.milestones),
      cmsService.listPages(scope),
      cmsService.listPosts(scope),
      cmsService.listBanners(scope),
      isAdmin ? cmsService.listMedia(scope) : [],
      cmsService.listTestimonials(scope),
      opsService.listNotifications(scope),
      opsService.preferences(scope),
      opsService.listDevices(scope),
      opsService.listBroadcasts(scope),
      isAdmin ? auditService.list(scope) : [],
      isAdmin ? opsService.listRoles(scope) : [],
      opsService.settings(),
      isAdmin ? analyticsService.snapshot(scope) : EMPTY_ANALYTICS,
      kidsService.journeysFor(scope),
      kidsService.sessions(scope),
      kidsService.listArtwork(scope),
    ]);

    // Messages for the threads we just loaded, in one round trip rather than one
    // per conversation — but only recent ones, and only so many. This used to
    // fetch every message in every thread the login could see, which for a
    // school two years in is the entire parent-teacher correspondence on every
    // portal load.
    //
    // Newest first for the cap to bite on the right end, then reversed, because
    // a thread reads oldest to newest.
    const messageRows = conversations.length
      ? await prisma.message.findMany({
          where: {
            conversationId: { in: conversations.map((c) => c.id) },
            createdAt: { gte: since },
          },
          orderBy: { createdAt: "desc" },
          take: CAP.messages,
        })
      : [];
    messageRows.reverse();

    const messages: Message[] = messageRows.map((m) => ({
          id: m.id,
          conversationId: m.conversationId,
          senderId: m.senderId,
          senderName: m.senderName,
          senderRole: m.senderRole,
          kind: m.kind,
          body: m.body,
          ...(m.durationSec != null ? { durationSec: m.durationSec } : {}),
      createdAt: m.createdAt.toISOString(),
      readAt: m.readAt ? m.readAt.toISOString() : null,
    }));

    // Medical profiles only for children this login is responsible for.
    const medicalStudentIds = students.map((s) => s.id);
    const medicalProfiles = medicalStudentIds.length
      ? (
          await prisma.medicalProfile.findMany({ where: { studentId: { in: medicalStudentIds } } })
        ).map(toMedicalProfile)
      : [];

    const emergencyContacts = medicalStudentIds.length
      ? (
          await prisma.emergencyContact.findMany({
            where: { studentId: { in: medicalStudentIds } },
            orderBy: { priority: "asc" },
          })
        ).map((c) => ({
          id: c.id,
          studentId: c.studentId,
          name: c.name,
          relation: c.relation,
          phone: c.phone,
          priority: c.priority,
          createdAt: c.createdAt.toISOString(),
          updatedAt: c.updatedAt.toISOString(),
        }))
      : [];

    // A cap that is hit silently is the dangerous kind: the client draws the
    // newest N and there is nothing on screen, or in the payload, to say the
    // rest exists. So say it — in the response, and in the log where whoever
    // runs this can see that the windows need revisiting.
    const truncated = (
      [
        ["attendance", attendance.length, CAP.attendance],
        ["messages", messages.length, CAP.messages],
        ["invoices", invoices.length, CAP.invoices],
        ["payments", payments.length, CAP.payments],
        ["progressReports", progressReports.length, CAP.progressReports],
        ["milestones", milestones.length, CAP.milestones],
      ] as const
    )
      .filter(([, count, cap]) => count >= cap)
      .map(([name]) => name as string);

    if (truncated.length) {
      logger.warn("Bootstrap snapshot hit a cap", { truncated, role: scope.role, windowDays: WINDOW_DAYS });
    }

    return {
      coverage: { since: since.toISOString(), truncated } satisfies SnapshotCoverage,
      branches,
      classrooms,
      students,
      guardians,
      staff,
      attendance,
      pickupAuthorizations,
      activities,
      notices,
      conversations,
      messages,
      meetings,
      feeStructures,
      invoices,
      payments,
      events,
      inquiries,
      applications,
      visitBookings,
      lessons,
      progressReports,
      milestones,
      cmsPages,
      blogPosts,
      banners,
      mediaAssets,
      testimonials,
      notifications,
      notificationPreference,
      devices,
      emergencyContacts,
      medicalProfiles,
      safetyBroadcasts,
      auditEntries,
      roleDefinitions,
      settings,
      analytics,
      journeys,
      gameSessions,
      artworks,
    };
  },
};
