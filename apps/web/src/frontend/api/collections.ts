"use client";

/**
 * Where each store collection lives on the server.
 *
 * The portal's generic CRUD (`addItem` / `patchItem` / `removeItem`) needs to
 * know which URL a collection maps to. Spelling that out in one table — rather
 * than one generic `/api/collections/:key` endpoint — keeps the API the
 * resource-shaped one the SoW specifies, and keeps every route's validation and
 * RBAC specific to what it actually accepts.
 *
 * A collection missing from this table, or missing a verb, is deliberate: it
 * means the UI reaches that data through a domain action (paying an invoice,
 * marking attendance) rather than by writing a row.
 */
import type { CollectionKey } from "@/frontend/store/erpStore";

export interface CollectionRoute {
  /** Base path under /api. */
  path: string;
  /** Key the server wraps the record in, e.g. `{ student: {...} }`. */
  entity: string;
  create?: "POST" | "PATCH";
  update?: boolean;
  remove?: boolean;
  /** Path segment for a single record — the id unless stated otherwise. */
  idField?: "id" | "slug";
  /** No id segment at all: the body identifies the record (fee structures). */
  singleton?: boolean;
}

export const COLLECTION_ROUTES: Partial<Record<CollectionKey, CollectionRoute>> = {
  branches: { path: "/branches", entity: "branch", create: "POST", update: true },
  classrooms: { path: "/classrooms", entity: "classroom", create: "POST", update: true, remove: true },
  students: { path: "/students", entity: "student", create: "POST", update: true, remove: true },
  guardians: { path: "/guardians", entity: "guardian", create: "POST", update: true },
  staff: { path: "/staff", entity: "staff", create: "POST", update: true },

  activities: { path: "/activities", entity: "activity", create: "POST", update: true, remove: true },
  notices: { path: "/notices", entity: "notice", create: "POST", update: true, remove: true },
  events: { path: "/events", entity: "event", create: "POST", update: true, remove: true },
  meetings: { path: "/meetings", entity: "meeting", create: "POST", update: true },
  conversations: { path: "/conversations", entity: "conversation", update: true },

  invoices: { path: "/fees/invoices", entity: "invoice", create: "POST", update: true },
  feeStructures: { path: "/fees/structures", entity: "feeStructure", update: true, singleton: true },

  inquiries: { path: "/admissions/inquiry", entity: "inquiry", create: "POST", update: true, remove: true },
  applications: { path: "/admissions/applications", entity: "application", create: "POST", update: true },
  visitBookings: { path: "/admissions/visit-bookings", entity: "booking", create: "POST", update: true },

  lessons: { path: "/lessons", entity: "lesson", create: "POST", update: true, remove: true },
  milestones: { path: "/milestones", entity: "milestone", create: "POST", remove: true },
  // Reports are keyed by (student, term): both create and edit are the same
  // upsert, so there is no PATCH-by-id.
  progressReports: { path: "/reports", entity: "report", create: "POST", update: true, singleton: true },

  cmsPages: { path: "/cms/pages", entity: "page", create: "PATCH", update: true, idField: "slug" },
  blogPosts: { path: "/cms/blog", entity: "post", create: "POST", update: true, remove: true },
  banners: { path: "/cms/banners", entity: "banner", create: "POST", update: true, remove: true },
  mediaAssets: { path: "/cms/media", entity: "asset", create: "POST", update: true, remove: true },
  testimonials: { path: "/testimonials", entity: "testimonial", create: "POST", update: true, remove: true },

  emergencyContacts: { path: "/emergency/contacts", entity: "contact", create: "POST", update: true, remove: true },
  safetyBroadcasts: { path: "/emergency/broadcasts", entity: "broadcast", create: "POST" },
  pickupAuthorizations: { path: "/attendance/pickup-authorization", entity: "authorization", create: "POST" },
  devices: { path: "/notifications/devices", entity: "device", create: "POST", remove: true },
  artworks: { path: "/artworks", entity: "artwork", create: "POST", remove: true },
};
