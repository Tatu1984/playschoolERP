"use client";

/**
 * The single client-side source of truth for every ERP surface (admin, teacher,
 * parent, kids). Seeded from `@/shared/fixtures` and persisted to localStorage
 * so create/edit/delete survives navigation and reload.
 *
 * ⚠️ This is the seam the backend phase replaces: each action here maps 1:1 to
 * an endpoint in SoW §7. Components never touch fixtures directly — they go
 * through selectors in `@/frontend/store/selectors` and actions on this store,
 * so swapping in `fetch()` calls does not touch a single component.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

import type {
  Activity,
  ActivityComment,
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
import type {
  AttendanceRecord,
  AttendanceStatus,
  Branch,
  Classroom,
  Guardian,
  PickupAuthorization,
  Staff,
  Student,
} from "@/shared/types/school.types";
import type {
  Artwork,
  Banner,
  BlogPost,
  CmsPage,
  GameSession,
  JourneyState,
  MascotKey,
  MediaAsset,
  Milestone,
  Lesson,
  ProgressReport,
  Testimonial,
} from "@/shared/types/learning.types";
import type {
  AnalyticsSnapshot,
  AppNotification,
  AuditEntry,
  DeviceToken,
  EmergencyContact,
  MedicalProfile,
  NotificationPreference,
  RoleDefinition,
  SafetyBroadcast,
  SchoolSettings,
} from "@/shared/types/ops.types";
import type { ID } from "@/shared/types/common.types";
import type { Role } from "@/shared/constants/roles";

import { BADGES, buildDemoData } from "@/shared/fixtures";
import { newId, toggle } from "@/shared/utils/common.util";
import { dateKey, nowIso, today } from "@/shared/utils/date.util";

// ---------------------------------------------------------------- shape

export interface ErpData {
  branches: Branch[];
  classrooms: Classroom[];
  students: Student[];
  guardians: Guardian[];
  staff: Staff[];

  attendance: AttendanceRecord[];
  pickupAuthorizations: PickupAuthorization[];

  activities: Activity[];
  notices: Notice[];
  conversations: Conversation[];
  messages: Message[];
  meetings: Meeting[];

  feeStructures: FeeStructure[];
  invoices: Invoice[];
  payments: Payment[];

  events: SchoolEvent[];
  inquiries: Inquiry[];
  applications: Application[];
  visitBookings: VisitBooking[];

  lessons: Lesson[];
  progressReports: ProgressReport[];
  milestones: Milestone[];

  cmsPages: CmsPage[];
  blogPosts: BlogPost[];
  banners: Banner[];
  mediaAssets: MediaAsset[];
  testimonials: Testimonial[];

  notifications: AppNotification[];
  notificationPreference: NotificationPreference;
  devices: DeviceToken[];
  emergencyContacts: EmergencyContact[];
  medicalProfiles: MedicalProfile[];
  safetyBroadcasts: SafetyBroadcast[];
  auditEntries: AuditEntry[];
  roleDefinitions: RoleDefinition[];
  settings: SchoolSettings;
  analytics: AnalyticsSnapshot;

  journeys: JourneyState[];
  gameSessions: GameSession[];
  artworks: Artwork[];
}

/** Keys of ErpData that hold arrays of `{ id }` records — the CRUD-able ones. */
export type CollectionKey = {
  [K in keyof ErpData]: ErpData[K] extends { id: string }[] ? K : never;
}[keyof ErpData];

type ItemOf<K extends CollectionKey> = ErpData[K][number];

export interface ErpActions {
  // -- generic CRUD (maps to POST / PATCH / DELETE on the matching resource)
  addItem<K extends CollectionKey>(key: K, item: ItemOf<K>): void;
  patchItem<K extends CollectionKey>(key: K, id: ID, patch: Partial<ItemOf<K>>): void;
  removeItem<K extends CollectionKey>(key: K, id: ID): void;
  removeMany<K extends CollectionKey>(key: K, ids: ID[]): void;

  // -- domain actions with real business rules
  markAttendance(studentId: ID, classroomId: ID, status: AttendanceStatus, date?: string): void;
  bulkMarkAttendance(classroomId: ID, status: AttendanceStatus, date?: string): void;
  checkIn(studentId: ID, classroomId: ID): void;
  checkOut(studentId: ID, pickedUpBy: string): void;
  updateDayLog(studentId: ID, date: string, patch: Partial<AttendanceRecord>): void;

  toggleActivityReaction(activityId: ID, userId: ID): void;
  commentOnActivity(activityId: ID, comment: Omit<ActivityComment, "id" | "createdAt">): void;
  publishActivity(activityId: ID, published: boolean): void;

  markNoticeRead(noticeId: ID, userId: ID): void;
  publishNotice(noticeId: ID, publish: boolean): void;

  sendMessage(conversationId: ID, msg: Omit<Message, "id" | "createdAt" | "conversationId" | "readAt">): void;
  startConversation(conv: Omit<Conversation, "id" | "createdAt">, firstMessage: string, sender: Pick<Message, "senderId" | "senderName" | "senderRole">): ID;
  markConversationRead(conversationId: ID, side: "parent" | "teacher"): void;

  payInvoice(invoiceId: ID, amount: number, method: Payment["method"]): void;
  issueInvoice(invoice: Invoice): void;

  rsvpEvent(eventId: ID, userId: ID, name: string, guests: number): void;
  cancelRsvp(eventId: ID, userId: ID): void;

  moveInquiry(inquiryId: ID, stage: Inquiry["stage"]): void;
  addInquiryNote(inquiryId: ID, body: string, author: string): void;
  setApplicationStatus(applicationId: ID, status: Application["status"], note?: string): void;
  toggleApplicationDoc(applicationId: ID, docId: ID): void;

  markNotificationRead(id: ID): void;
  markAllNotificationsRead(userId: ID): void;
  setNotificationPreference(patch: Partial<NotificationPreference>): void;

  setRolePermissions(role: Role, permissions: string[]): void;
  upsertMedicalProfile(profile: MedicalProfile): void;
  updateSettings(patch: Partial<SchoolSettings>): void;
  toggleFeature(key: keyof SchoolSettings["features"]): void;
  logAudit(entry: Omit<AuditEntry, "id" | "createdAt">): void;

  // -- kids zone
  finishGame(studentId: ID, gameSlug: string, score: number, stars: number, durationSec: number): string[];
  finishStory(studentId: ID, storyId: string): void;
  setMascot(studentId: ID, mascot: MascotKey): void;
  saveArtwork(studentId: ID, title: string, dataUrl: string): void;

  resetDemoData(): void;
}

export type ErpStore = ErpData & ErpActions;

// ---------------------------------------------------------------- helpers

function replace<T extends { id: string }>(list: T[], id: ID, patch: Partial<T>): T[] {
  return list.map((item) => (item.id === id ? { ...item, ...patch, updatedAt: nowIso() } : item));
}

function ensureJourney(journeys: JourneyState[], studentId: ID): JourneyState {
  return (
    journeys.find((j) => j.studentId === studentId) ?? {
      studentId,
      stars: 0,
      level: 1,
      streakDays: 0,
      lastPlayedOn: null,
      unlockedBadges: [],
      completedGames: [],
      finishedStories: [],
      mascot: "kiki",
    }
  );
}

const STORE_VERSION = 1;

// ---------------------------------------------------------------- store

export const useErpStore = create<ErpStore>()(
  persist(
    (set, get) => ({
      ...buildDemoData(),

      // ---- generic CRUD -----------------------------------------------
      addItem: (key, item) =>
        set((state) => {
          const list = state[key] as { id: string }[];
          return { [key]: [item, ...list] } as unknown as Partial<ErpStore>;
        }),

      patchItem: (key, id, patch) =>
        set((state) => {
          const list = state[key] as { id: string }[];
          return { [key]: replace(list, id, patch) } as unknown as Partial<ErpStore>;
        }),

      removeItem: (key, id) =>
        set((state) => {
          const list = state[key] as { id: string }[];
          return { [key]: list.filter((i) => i.id !== id) } as unknown as Partial<ErpStore>;
        }),

      removeMany: (key, ids) =>
        set((state) => {
          const list = state[key] as { id: string }[];
          return { [key]: list.filter((i) => !ids.includes(i.id)) } as unknown as Partial<ErpStore>;
        }),

      // ---- attendance --------------------------------------------------
      markAttendance: (studentId, classroomId, status, date = dateKey(today())) =>
        set((state) => {
          const existing = state.attendance.find((a) => a.studentId === studentId && a.date === date);
          if (existing) {
            return {
              attendance: replace(state.attendance, existing.id, {
                status,
                checkInAt: status === "ABSENT" ? null : (existing.checkInAt ?? nowIso()),
              }),
            };
          }
          const record: AttendanceRecord = {
            id: newId("att"),
            studentId,
            classroomId,
            date,
            status,
            checkInAt: status === "ABSENT" ? null : nowIso(),
            checkOutAt: null,
            pickedUpBy: null,
            markedByStaffId: null,
            note: "",
            mood: null,
            mealsEaten: null,
            napMinutes: null,
            createdAt: nowIso(),
          };
          return { attendance: [record, ...state.attendance] };
        }),

      bulkMarkAttendance: (classroomId, status, date = dateKey(today())) => {
        const roster = get().students.filter((s) => s.classroomId === classroomId);
        roster.forEach((s) => get().markAttendance(s.id, classroomId, status, date));
      },

      checkIn: (studentId, classroomId) => {
        const date = dateKey(today());
        get().markAttendance(studentId, classroomId, "PRESENT", date);
        set((state) => {
          const rec = state.attendance.find((a) => a.studentId === studentId && a.date === date);
          return rec ? { attendance: replace(state.attendance, rec.id, { checkInAt: nowIso() }) } : {};
        });
      },

      checkOut: (studentId, pickedUpBy) =>
        set((state) => {
          const date = dateKey(today());
          const rec = state.attendance.find((a) => a.studentId === studentId && a.date === date);
          if (!rec) return {};
          return {
            attendance: replace(state.attendance, rec.id, { checkOutAt: nowIso(), pickedUpBy }),
          };
        }),

      updateDayLog: (studentId, date, patch) =>
        set((state) => {
          const rec = state.attendance.find((a) => a.studentId === studentId && a.date === date);
          if (!rec) return {};
          return { attendance: replace(state.attendance, rec.id, patch) };
        }),

      // ---- feed --------------------------------------------------------
      toggleActivityReaction: (activityId, userId) =>
        set((state) => {
          const act = state.activities.find((a) => a.id === activityId);
          if (!act) return {};
          return { activities: replace(state.activities, activityId, { reactions: toggle(act.reactions, userId) }) };
        }),

      commentOnActivity: (activityId, comment) =>
        set((state) => {
          const act = state.activities.find((a) => a.id === activityId);
          if (!act) return {};
          const full: ActivityComment = { ...comment, id: newId("cmt"), createdAt: nowIso() };
          return { activities: replace(state.activities, activityId, { comments: [...act.comments, full] }) };
        }),

      publishActivity: (activityId, published) =>
        set((state) => ({ activities: replace(state.activities, activityId, { published }) })),

      // ---- notices -----------------------------------------------------
      markNoticeRead: (noticeId, userId) =>
        set((state) => {
          const notice = state.notices.find((n) => n.id === noticeId);
          if (!notice || notice.readBy.includes(userId)) return {};
          return { notices: replace(state.notices, noticeId, { readBy: [...notice.readBy, userId] }) };
        }),

      publishNotice: (noticeId, publish) =>
        set((state) => ({
          notices: replace(state.notices, noticeId, { publishedAt: publish ? nowIso() : null }),
        })),

      // ---- messaging ---------------------------------------------------
      sendMessage: (conversationId, msg) =>
        set((state) => {
          const full: Message = { ...msg, id: newId("msg"), conversationId, createdAt: nowIso(), readAt: null };
          const conv = state.conversations.find((c) => c.id === conversationId);
          return {
            messages: [...state.messages, full],
            conversations: conv
              ? replace(state.conversations, conversationId, {
                  lastMessageAt: full.createdAt,
                  lastMessagePreview: full.kind === "VOICE" ? "🎤 Voice note" : full.body,
                  unreadForParent: msg.senderRole === "PARENT" ? conv.unreadForParent : conv.unreadForParent + 1,
                  unreadForTeacher: msg.senderRole === "PARENT" ? conv.unreadForTeacher + 1 : conv.unreadForTeacher,
                })
              : state.conversations,
          };
        }),

      startConversation: (conv, firstMessage, sender) => {
        const id = newId("cv");
        const createdAt = nowIso();
        set((state) => ({
          conversations: [
            {
              ...conv,
              id,
              createdAt,
              lastMessageAt: createdAt,
              lastMessagePreview: firstMessage,
              unreadForParent: sender.senderRole === "PARENT" ? 0 : 1,
              unreadForTeacher: sender.senderRole === "PARENT" ? 1 : 0,
            },
            ...state.conversations,
          ],
          messages: [
            ...state.messages,
            {
              id: newId("msg"),
              conversationId: id,
              ...sender,
              kind: "TEXT" as const,
              body: firstMessage,
              createdAt,
              readAt: null,
            },
          ],
        }));
        return id;
      },

      markConversationRead: (conversationId, side) =>
        set((state) => ({
          conversations: replace(
            state.conversations,
            conversationId,
            side === "parent" ? { unreadForParent: 0 } : { unreadForTeacher: 0 },
          ),
          messages: state.messages.map((m) =>
            m.conversationId === conversationId && !m.readAt ? { ...m, readAt: nowIso() } : m,
          ),
        })),

      // ---- fees --------------------------------------------------------
      payInvoice: (invoiceId, amount, method) =>
        set((state) => {
          const inv = state.invoices.find((i) => i.id === invoiceId);
          // Ignore no-op collections so a ₹0 submit can never flip an unpaid
          // invoice to PAID or mint an empty receipt.
          if (!inv || amount <= 0) return {};
          const paidAmount = Math.min(inv.amount + inv.lateFee, inv.paidAmount + amount);
          const settled = paidAmount >= inv.amount + inv.lateFee;
          const payment: Payment = {
            id: newId("pay"),
            invoiceId,
            studentId: inv.studentId,
            amount,
            method,
            reference: `RZP${Math.floor(Date.now() / 1000)}`,
            paidAt: nowIso(),
            receiptNo: `RCPT/${3000 + state.payments.length}`,
            gatewayOrderId: `order_${newId("o")}`,
            createdAt: nowIso(),
          };
          return {
            payments: [payment, ...state.payments],
            invoices: replace(state.invoices, invoiceId, {
              paidAmount,
              status: settled ? "PAID" : "PARTIAL",
            }),
          };
        }),

      issueInvoice: (invoice) => set((state) => ({ invoices: [invoice, ...state.invoices] })),

      // ---- events ------------------------------------------------------
      rsvpEvent: (eventId, userId, name, guests) =>
        set((state) => {
          const ev = state.events.find((e) => e.id === eventId);
          if (!ev) return {};
          const rsvps = [...ev.rsvps.filter((r) => r.userId !== userId), { userId, name, guests }];
          return { events: replace(state.events, eventId, { rsvps }) };
        }),

      cancelRsvp: (eventId, userId) =>
        set((state) => {
          const ev = state.events.find((e) => e.id === eventId);
          if (!ev) return {};
          return { events: replace(state.events, eventId, { rsvps: ev.rsvps.filter((r) => r.userId !== userId) }) };
        }),

      // ---- admissions --------------------------------------------------
      moveInquiry: (inquiryId, stage) =>
        set((state) => ({ inquiries: replace(state.inquiries, inquiryId, { stage }) })),

      addInquiryNote: (inquiryId, body, author) =>
        set((state) => {
          const inq = state.inquiries.find((i) => i.id === inquiryId);
          if (!inq) return {};
          return {
            inquiries: replace(state.inquiries, inquiryId, {
              notes: [...inq.notes, { id: newId("n"), body, author, createdAt: nowIso() }],
            }),
          };
        }),

      setApplicationStatus: (applicationId, status, note) =>
        set((state) => ({
          applications: replace(state.applications, applicationId, {
            status,
            ...(note !== undefined ? { decisionNote: note } : {}),
          }),
        })),

      toggleApplicationDoc: (applicationId, docId) =>
        set((state) => {
          const app = state.applications.find((a) => a.id === applicationId);
          if (!app) return {};
          return {
            applications: replace(state.applications, applicationId, {
              documents: app.documents.map((d) =>
                d.id === docId
                  ? { ...d, uploaded: !d.uploaded, fileName: !d.uploaded ? `${d.label.toLowerCase().replace(/ /g, "-")}.pdf` : undefined }
                  : d,
              ),
            }),
          };
        }),

      // ---- notifications ------------------------------------------------
      markNotificationRead: (id) =>
        set((state) => ({ notifications: replace(state.notifications, id, { read: true }) })),

      markAllNotificationsRead: (userId) =>
        set((state) => ({
          notifications: state.notifications.map((n) => (n.userId === userId ? { ...n, read: true } : n)),
        })),

      setNotificationPreference: (patch) =>
        set((state) => ({ notificationPreference: { ...state.notificationPreference, ...patch } })),

      // ---- settings / audit ---------------------------------------------
      upsertMedicalProfile: (profile) =>
        set((state) => ({
          medicalProfiles: state.medicalProfiles.some((m) => m.studentId === profile.studentId)
            ? state.medicalProfiles.map((m) => (m.studentId === profile.studentId ? profile : m))
            : [...state.medicalProfiles, profile],
        })),

      setRolePermissions: (role, permissions) =>
        set((state) => ({
          roleDefinitions: state.roleDefinitions.map((d) => (d.role === role ? { ...d, permissions } : d)),
        })),

      updateSettings: (patch) => set((state) => ({ settings: { ...state.settings, ...patch } })),

      toggleFeature: (key) =>
        set((state) => ({
          settings: { ...state.settings, features: { ...state.settings.features, [key]: !state.settings.features[key] } },
        })),

      logAudit: (entry) =>
        set((state) => ({
          auditEntries: [{ ...entry, id: newId("au"), createdAt: nowIso() }, ...state.auditEntries],
        })),

      // ---- kids zone -----------------------------------------------------
      finishGame: (studentId, gameSlug, score, stars, durationSec) => {
        const journey = ensureJourney(get().journeys, studentId);
        const totalStars = journey.stars + stars;
        const streakDays =
          journey.lastPlayedOn === dateKey(today())
            ? journey.streakDays
            : journey.streakDays + 1;
        const unlocked = BADGES.filter((b) => totalStars >= b.requiredStars).map((b) => b.key);
        const fresh = unlocked.filter((k) => !journey.unlockedBadges.includes(k));

        const next: JourneyState = {
          ...journey,
          stars: totalStars,
          level: Math.max(1, Math.floor(totalStars / 10) + 1),
          streakDays,
          lastPlayedOn: dateKey(today()),
          unlockedBadges: unlocked,
          completedGames: journey.completedGames.includes(gameSlug)
            ? journey.completedGames
            : [...journey.completedGames, gameSlug],
        };

        set((state) => ({
          journeys: [...state.journeys.filter((j) => j.studentId !== studentId), next],
          gameSessions: [
            {
              id: newId("gs"),
              gameSlug,
              studentId,
              score,
              stars,
              durationSec,
              completed: true,
              createdAt: nowIso(),
            },
            ...state.gameSessions,
          ],
        }));
        return fresh;
      },

      finishStory: (studentId, storyId) => {
        const journey = ensureJourney(get().journeys, studentId);
        if (journey.finishedStories.includes(storyId)) return;
        const next: JourneyState = {
          ...journey,
          stars: journey.stars + 1,
          finishedStories: [...journey.finishedStories, storyId],
        };
        next.unlockedBadges = BADGES.filter((b) => next.stars >= b.requiredStars).map((b) => b.key);
        set((state) => ({ journeys: [...state.journeys.filter((j) => j.studentId !== studentId), next] }));
      },

      setMascot: (studentId, mascot) => {
        const journey = ensureJourney(get().journeys, studentId);
        set((state) => ({
          journeys: [...state.journeys.filter((j) => j.studentId !== studentId), { ...journey, mascot }],
        }));
      },

      saveArtwork: (studentId, title, dataUrl) =>
        set((state) => ({
          artworks: [{ id: newId("art"), studentId, title, dataUrl, createdAt: nowIso() }, ...state.artworks],
        })),

      resetDemoData: () => set({ ...buildDemoData() }),
    }),
    {
      name: "climbkiddo-erp-demo",
      version: STORE_VERSION,
      // A schema change invalidates the cached demo data rather than trying to
      // migrate it — this is throwaway state until the API exists.
      migrate: () => ({ ...buildDemoData() }) as unknown as ErpStore,
    },
  ),
);
