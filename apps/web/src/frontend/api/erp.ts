"use client";

/**
 * Every server call the ERP store makes, in one place.
 *
 * These mirror the store's domain actions one-for-one. The store applies the
 * change locally first so the UI never waits on the network, then calls the
 * matching function here; the server's answer is the one that sticks.
 */
import { del, get, patch, post } from "./client";
import { COLLECTION_ROUTES, type CollectionRoute } from "./collections";
import type { CollectionKey, ErpData } from "@/frontend/store/erpStore";
import type { AttendanceStatus } from "@/shared/types/school.types";
import type {
  Application,
  Inquiry,
  Message,
  Payment,
} from "@/shared/types/engagement.types";
import type { MascotKey } from "@/shared/types/learning.types";
import type { NotificationPreference, SchoolSettings } from "@/shared/types/ops.types";
import type { Role } from "@/shared/constants/roles";

// ---------------------------------------------------------------- bootstrap

export async function fetchSnapshot(): Promise<ErpData> {
  const { data } = await get<{ data: ErpData }>("/bootstrap");
  return data;
}

// ------------------------------------------------------------ generic CRUD

function routeFor(key: CollectionKey): CollectionRoute | undefined {
  return COLLECTION_ROUTES[key];
}

/** Returns the server's canonical record, so the optimistic one can be swapped. */
export async function createRecord<T>(key: CollectionKey, item: T): Promise<T | null> {
  const route = routeFor(key);
  if (!route?.create) return null;
  const target =
    route.create === "PATCH"
      ? `${route.path}/${(item as Record<string, unknown>)[route.idField ?? "id"]}`
      : route.path;
  const res = await (route.create === "PATCH"
    ? patch<Record<string, T>>(target, item)
    : post<Record<string, T>>(target, item));
  return res?.[route.entity] ?? null;
}

export async function updateRecord<T>(
  key: CollectionKey,
  id: string,
  body: unknown,
): Promise<T | null> {
  const route = routeFor(key);
  if (!route?.update) return null;
  const target = route.singleton ? route.path : `${route.path}/${id}`;
  const res = await patch<Record<string, T>>(target, body);
  return res?.[route.entity] ?? null;
}

export async function deleteRecord(key: CollectionKey, id: string): Promise<void> {
  const route = routeFor(key);
  if (!route?.remove) return;
  await del(`${route.path}/${id}`);
}

// ---------------------------------------------------------------- attendance

export const markAttendance = (studentId: string, classroomId: string, status: AttendanceStatus, date?: string) =>
  post("/attendance", { studentId, classroomId, status, date });

export const bulkMarkAttendance = (classroomId: string, status: AttendanceStatus, date?: string) =>
  post("/attendance/bulk", { classroomId, status, date });

export const checkIn = (studentId: string, classroomId: string) =>
  post("/attendance/check-in", { studentId, classroomId });

export const checkOut = (studentId: string, pickedUpBy: string, code?: string) =>
  post("/attendance/check-out", { studentId, pickedUpBy, code });

export const updateDayLog = (studentId: string, date: string, body: Record<string, unknown>) =>
  patch("/attendance/day-log", { studentId, date, ...body });

// ---------------------------------------------------------------------- feed

export const toggleReaction = (activityId: string) => post(`/activities/${activityId}/reactions`);
export const commentOnActivity = (activityId: string, body: string) =>
  post(`/activities/${activityId}/comments`, { body });
export const setActivityPublished = (activityId: string, published: boolean) =>
  patch(`/activities/${activityId}`, { published });

// ------------------------------------------------------------------ notices

export const markNoticeRead = (noticeId: string) => post(`/notices/${noticeId}/read`);
export const setNoticePublished = (noticeId: string, publish: boolean) =>
  patch(`/notices/${noticeId}`, { publish });

// ---------------------------------------------------------------- messaging

export const sendMessage = (
  conversationId: string,
  msg: Pick<Message, "kind" | "body"> & { durationSec?: number },
) => post(`/conversations/${conversationId}/messages`, msg);

export const startConversation = (body: {
  studentId: string;
  participantIds: string[];
  parentName: string;
  teacherName: string;
  subject: string;
  firstMessage: string;
}) => post<{ conversation: { id: string } }>("/conversations", body);

export const markConversationRead = (conversationId: string) =>
  post(`/conversations/${conversationId}/read`);

export const setMeetingStatus = (id: string, status: string) => patch(`/meetings/${id}`, { status });

// --------------------------------------------------------------------- fees

/**
 * Pay an invoice. With a real gateway this only opens an order — the invoice
 * moves when the webhook lands. Against the mock driver the dev-only settle
 * endpoint stands in for the gateway callback, so the demo completes without
 * the client ever being trusted to declare a payment.
 */
export async function payInvoice(invoiceId: string, amount: number, method: Payment["method"]) {
  if (method === "CASH" || method === "CHEQUE") {
    return post("/fees/payments", { invoiceId, amount, method });
  }
  const { order } = await post<{ order: { id: string; mock: boolean } }>("/fees/create-order", {
    invoiceId,
    amount,
  });
  if (order.mock) {
    return post("/fees/mock-settle", { orderId: order.id, invoiceId, amount, method });
  }
  return { order };
}

// ------------------------------------------------------------------- events

export const rsvpEvent = (eventId: string, guests: number) =>
  post(`/events/${eventId}/rsvp`, { guests });
export const cancelRsvp = (eventId: string) => del(`/events/${eventId}/rsvp`);

// --------------------------------------------------------------- admissions

export const moveInquiry = (id: string, stage: Inquiry["stage"]) =>
  patch(`/admissions/inquiry/${id}`, { stage });
export const addInquiryNote = (id: string, body: string) =>
  post(`/admissions/inquiry/${id}/notes`, { body });
export const setApplicationStatus = (id: string, status: Application["status"], note?: string) =>
  patch(`/admissions/applications/${id}`, { status, note });
export const toggleApplicationDoc = (id: string, docId: string) =>
  post(`/admissions/applications/${id}/documents`, { docId });

// ------------------------------------------------------------ notifications

export const markNotificationRead = (id: string) => post("/notifications/read", { id });
export const markAllNotificationsRead = () => post("/notifications/read", { all: true });
export const setNotificationPreference = (body: Partial<NotificationPreference>) =>
  post("/notifications/preferences", body);

// ------------------------------------------------------------ admin & safety

export const setRolePermissions = (role: Role, permissions: string[]) =>
  patch("/roles", { role, permissions });
export const upsertMedicalProfile = (studentId: string, body: Record<string, unknown>) =>
  patch(`/medical/${studentId}`, body);
export const updateSettings = (body: Partial<SchoolSettings>) => patch("/settings", body);
export const acknowledgeBroadcast = (id: string) => post(`/emergency/broadcasts/${id}/ack`);

// ---------------------------------------------------------------- kids zone

export const finishGame = (body: {
  studentId: string;
  gameSlug: string;
  score: number;
  stars: number;
  durationSec: number;
}) => post<{ journey: unknown; newBadges: { key: string }[] }>("/games/sessions", body);

export const finishStory = (studentId: string, storyId: string) =>
  post(`/stories/${storyId}`, { studentId });

export const setMascot = (studentId: string, mascot: MascotKey) =>
  patch(`/journey/${studentId}`, { mascot });

export const saveArtwork = (studentId: string, title: string, dataUrl: string) =>
  post("/artworks", { studentId, title, dataUrl });
