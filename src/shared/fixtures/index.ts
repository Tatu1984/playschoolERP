/**
 * The complete demo dataset. Single import point for the frontend store today
 * and for `prisma/seed.ts` once the backend phase lands.
 */
export * from "./school.fixture";
export * from "./engagement.fixture";
export * from "./learning.fixture";
export * from "./content.fixture";
export * from "./ops.fixture";

import {
  BRANCHES,
  CLASSROOMS,
  GUARDIANS,
  PROGRAMS,
  STAFF,
  STUDENTS,
} from "./school.fixture";
import {
  ACTIVITIES,
  APPLICATIONS,
  ATTENDANCE,
  CONVERSATIONS,
  EVENTS,
  FEE_STRUCTURES,
  INQUIRIES,
  INVOICES,
  MEETINGS,
  MESSAGES,
  NOTICES,
  PAYMENTS,
  VISIT_BOOKINGS,
} from "./engagement.fixture";
import {
  BADGES,
  CURRICULUM,
  GAMES,
  JOURNEY,
  LESSONS,
  MILESTONES,
  PROGRESS_REPORTS,
  STORIES,
} from "./learning.fixture";
import {
  BANNERS,
  BLOG_POSTS,
  CMS_PAGES,
  MEDIA_ASSETS,
  TESTIMONIALS,
} from "./content.fixture";
import {
  ANALYTICS,
  AUDIT_ENTRIES,
  DEVICE_TOKENS,
  EMERGENCY_CONTACTS,
  MEDICAL_PROFILES,
  NOTIFICATIONS,
  NOTIFICATION_PREFERENCE,
  ROLE_DEFINITIONS,
  SAFETY_BROADCASTS,
  SCHOOL_SETTINGS,
} from "./ops.fixture";

/** Read-only catalogues (never mutated by the UI). */
export const CATALOGUE = {
  programs: PROGRAMS,
  games: GAMES,
  stories: STORIES,
  badges: BADGES,
  curriculum: CURRICULUM,
} as const;

export function buildDemoData() {
  return {
    branches: BRANCHES,
    classrooms: CLASSROOMS,
    students: STUDENTS,
    guardians: GUARDIANS,
    staff: STAFF,

    attendance: ATTENDANCE,
    pickupAuthorizations: [],

    activities: ACTIVITIES,
    notices: NOTICES,
    conversations: CONVERSATIONS,
    messages: MESSAGES,
    meetings: MEETINGS,

    feeStructures: FEE_STRUCTURES,
    invoices: INVOICES,
    payments: PAYMENTS,

    events: EVENTS,
    inquiries: INQUIRIES,
    applications: APPLICATIONS,
    visitBookings: VISIT_BOOKINGS,

    lessons: LESSONS,
    progressReports: PROGRESS_REPORTS,
    milestones: MILESTONES,

    cmsPages: CMS_PAGES,
    blogPosts: BLOG_POSTS,
    banners: BANNERS,
    mediaAssets: MEDIA_ASSETS,
    testimonials: TESTIMONIALS,

    notifications: NOTIFICATIONS,
    notificationPreference: NOTIFICATION_PREFERENCE,
    devices: DEVICE_TOKENS,
    emergencyContacts: EMERGENCY_CONTACTS,
    medicalProfiles: MEDICAL_PROFILES,
    safetyBroadcasts: SAFETY_BROADCASTS,
    auditEntries: AUDIT_ENTRIES,
    roleDefinitions: ROLE_DEFINITIONS,
    settings: SCHOOL_SETTINGS,
    analytics: ANALYTICS,

    journeys: [JOURNEY],
    gameSessions: [],
    artworks: [],
  };
}
