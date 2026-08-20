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
import type { Message } from "@/shared/types/engagement.types";

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
      attendanceService.list(scope),
      attendanceService.listPickupAuths(scope),
      feedService.list(scope),
      feedService.listNotices(scope),
      messagingService.listConversations(scope),
      messagingService.listMeetings(scope),
      isParent || isAdmin ? feeService.listStructures(scope) : [],
      isParent || isAdmin ? feeService.listInvoices(scope) : [],
      isParent || isAdmin ? feeService.listPayments(scope) : [],
      admissionService.listEvents(scope),
      isAdmin ? admissionService.listInquiries(scope) : [],
      isAdmin ? admissionService.listApplications(scope) : [],
      isAdmin ? admissionService.listVisits(scope) : [],
      isStaff ? learningService.listLessons(scope) : [],
      learningService.listReports(scope),
      learningService.listMilestones(scope),
      cmsService.listPages(scope),
      cmsService.listPosts(scope),
      cmsService.listBanners(scope),
      isAdmin ? cmsService.listMedia(scope) : [],
      cmsService.listTestimonials(scope),
      opsService.listNotifications(scope),
      opsService.preferences(scope),
      opsService.listDevices(scope),
      opsService.listBroadcasts(scope),
      isAdmin ? auditService.list() : [],
      isAdmin ? opsService.listRoles(scope) : [],
      opsService.settings(),
      isAdmin ? analyticsService.snapshot(scope) : EMPTY_ANALYTICS,
      kidsService.journeysFor(scope),
      kidsService.sessions(scope),
      kidsService.listArtwork(scope),
    ]);

    // Messages for the threads we just loaded, in one round trip rather than
    // one per conversation.
    const messages: Message[] = conversations.length
      ? (
          await prisma.message.findMany({
            where: { conversationId: { in: conversations.map((c) => c.id) } },
            orderBy: { createdAt: "asc" },
          })
        ).map((m) => ({
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
        }))
      : [];

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

    return {
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
