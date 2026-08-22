"use client";

/**
 * The portal's client-side cache of everything the signed-in user may see.
 *
 * Postgres is the source of truth. This store hydrates from `/api/bootstrap`
 * once per session and then works the way a good offline-tolerant client
 * should: apply the change locally so the UI never waits on the network, send
 * it to the server, and let the server's answer win.
 *
 * When a write fails — a stale record, a permission the UI guessed wrong, a
 * dropped connection — the store does not try to reconcile field by field. It
 * says so and refetches, because a cache that quietly disagrees with the school
 * office is worse than one that reloads.
 *
 * Components never touch fixtures or `fetch` directly: they call actions here
 * and the pure selectors in `queries.ts`. That is what made swapping the whole
 * data layer possible without editing a single page.
 */
import { create } from "zustand";
import { toast } from "sonner";

import { apiEnabled } from "@/frontend/api/client";
import * as remote from "@/frontend/api/erp";

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

/**
 * What the last snapshot actually covered.
 *
 * The bootstrap is time-bounded — a portal load fetches a term, not a school's
 * whole history — so the time-series collections below are a window rather than
 * everything. Optional because the fixtures the store starts from have no
 * server behind them.
 *
 * Anything that reports a total ("this child was absent 4 times") is reporting
 * it *within this window*, and screens that say otherwise are lying by omission.
 * The per-resource endpoints take the same filters when a screen needs to reach
 * further back.
 */
export interface SnapshotCoverage {
  /** Nothing older than this is present in the windowed collections. */
  since: string;
  /** Which collections `since` applies to. The server decides, not the screen. */
  windowed: string[];
  /** Collections that also hit a row cap, so are the newest N rather than all. */
  truncated: string[];
}

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

/** Load state. `hydrated` is what portal pages wait on before they render. */
export interface ErpMeta {
  hydrated: boolean;
  loading: boolean;
  /** Last sync failure, already shown as a toast; kept for the settings page. */
  lastError: string | null;
  /**
   * What the last snapshot covered, or null before one has landed. Metadata
   * about the fetch rather than one of the collections, which is why it sits
   * here and not in `ErpData` — it is also why it does not appear in
   * `CollectionKey` and cannot be handed to `addItem`.
   */
  coverage: SnapshotCoverage | null;
}

/** Keys of ErpData that hold arrays of `{ id }` records — the CRUD-able ones. */
export type CollectionKey = {
  [K in keyof ErpData]: ErpData[K] extends { id: string }[] ? K : never;
}[keyof ErpData];

type ItemOf<K extends CollectionKey> = ErpData[K][number];

export interface ErpActions {
  /** Pull everything this login may see and replace the cache with it. */
  refresh(): Promise<void>;
  /** Replace the cache with a snapshot already in hand (server-rendered use). */
  hydrate(data: ErpData): void;

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

export type ErpStore = ErpData & ErpMeta & ErpActions;

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

/**
 * Send a local change to the server. Failures are surfaced once and then healed
 * by refetching, rather than left as an optimistic lie on screen.
 */
function push(run: () => Promise<unknown>): void {
  if (!apiEnabled()) return;
  void run().catch((e: unknown) => {
    const message = e instanceof Error ? e.message : "Could not save that change";
    console.error("[erp] sync failed:", e);
    toast.error(message);
    useErpStore.setState({ lastError: message });
    void useErpStore.getState().refresh();
  });
}

/**
 * Swap an optimistic record for the server's canonical one. The client mints a
 * temporary id so the UI can render immediately; the database assigns the real
 * one, and everything that references it afterwards must use that.
 */
function reconcile<K extends CollectionKey>(key: K, tempId: ID, saved: ItemOf<K> | null): void {
  if (!saved) return;
  useErpStore.setState((state) => {
    const list = state[key] as { id: string }[];
    return { [key]: list.map((i) => (i.id === tempId ? saved : i)) } as unknown as Partial<ErpStore>;
  });
}

// ---------------------------------------------------------------- store

export const useErpStore = create<ErpStore>()(
    ((set, get) => ({
      // Fixtures are the shape of the cache before the first fetch lands, and
      // the dataset the store-flow tests drive directly. Portal pages wait for
      // `hydrated` (see StoreGate), so nobody ever sees them on screen.
      ...buildDemoData(),
      hydrated: false,
      loading: false,
      lastError: null,
      coverage: null,

      refresh: async () => {
        if (!apiEnabled()) {
          set({ hydrated: true });
          return;
        }
        set({ loading: true });
        try {
          const { coverage, ...data } = await remote.fetchSnapshot();
          set({ ...data, coverage: coverage ?? null, hydrated: true, loading: false, lastError: null });
        } catch (e) {
          const message = e instanceof Error ? e.message : "Could not load your data";
          console.error("[erp] bootstrap failed:", e);
          // Hydrated stays false: a portal showing fixture data as if it were
          // the school's would be worse than a portal that says it is stuck.
          set({ loading: false, lastError: message });
        }
      },

      hydrate: (data) => set({ ...data, hydrated: true, loading: false, lastError: null }),

      // ---- generic CRUD -----------------------------------------------
      addItem: (key, item) => {
        set((state) => {
          const list = state[key] as { id: string }[];
          return { [key]: [item, ...list] } as unknown as Partial<ErpStore>;
        });
        const tempId = (item as { id: ID }).id;
        push(async () => reconcile(key, tempId, await remote.createRecord(key, item)));
      },

      patchItem: (key, id, patch) => {
        set((state) => {
          const list = state[key] as { id: string }[];
          return { [key]: replace(list, id, patch) } as unknown as Partial<ErpStore>;
        });
        // Fee structures and progress reports are identified by a pair of
        // fields rather than an id, so they need the whole record, not a diff.
        const whole = (get()[key] as { id: string }[]).find((i) => i.id === id);
        push(() => remote.updateRecord(key, id, whole ?? patch));
      },

      removeItem: (key, id) => {
        set((state) => {
          const list = state[key] as { id: string }[];
          return { [key]: list.filter((i) => i.id !== id) } as unknown as Partial<ErpStore>;
        });
        push(() => remote.deleteRecord(key, id));
      },

      removeMany: (key, ids) => {
        set((state) => {
          const list = state[key] as { id: string }[];
          return { [key]: list.filter((i) => !ids.includes(i.id)) } as unknown as Partial<ErpStore>;
        });
        push(async () => {
          for (const id of ids) await remote.deleteRecord(key, id);
        });
      },

      // ---- attendance --------------------------------------------------
      markAttendance: (studentId, classroomId, status, date = dateKey(today())) => {
        push(() => remote.markAttendance(studentId, classroomId, status, date));
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
        });
      },

      bulkMarkAttendance: (classroomId, status, date = dateKey(today())) => {
        const roster = get().students.filter((s) => s.classroomId === classroomId);
        // One request for the class, not one per child — but the same local
        // reducer runs per child so the roster updates row by row.
        push(() => remote.bulkMarkAttendance(classroomId, status, date));
        roster.forEach((s) =>
          set((state) => {
            const existing = state.attendance.find((a) => a.studentId === s.id && a.date === date);
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
              studentId: s.id,
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
        );
      },

      checkIn: (studentId, classroomId) => {
        const date = dateKey(today());
        push(() => remote.checkIn(studentId, classroomId));
        get().markAttendance(studentId, classroomId, "PRESENT", date);
        set((state) => {
          const rec = state.attendance.find((a) => a.studentId === studentId && a.date === date);
          return rec ? { attendance: replace(state.attendance, rec.id, { checkInAt: nowIso() }) } : {};
        });
      },

      checkOut: (studentId, pickedUpBy) => {
        push(() => remote.checkOut(studentId, pickedUpBy));
        return set((state) => {
          const date = dateKey(today());
          const rec = state.attendance.find((a) => a.studentId === studentId && a.date === date);
          if (!rec) return {};
          return {
            attendance: replace(state.attendance, rec.id, { checkOutAt: nowIso(), pickedUpBy }),
          };
        });
      },

      updateDayLog: (studentId, date, patch) => {
        push(() => remote.updateDayLog(studentId, date, patch as Record<string, unknown>));
        set((state) => {
          const rec = state.attendance.find((a) => a.studentId === studentId && a.date === date);
          if (!rec) return {};
          return { attendance: replace(state.attendance, rec.id, patch) };
        });
      },

      // ---- feed --------------------------------------------------------
      toggleActivityReaction: (activityId, userId) => {
        push(() => remote.toggleReaction(activityId));
        set((state) => {
          const act = state.activities.find((a) => a.id === activityId);
          if (!act) return {};
          return { activities: replace(state.activities, activityId, { reactions: toggle(act.reactions, userId) }) };
        });
      },

      commentOnActivity: (activityId, comment) => {
        push(() => remote.commentOnActivity(activityId, comment.body));
        set((state) => {
          const act = state.activities.find((a) => a.id === activityId);
          if (!act) return {};
          const full: ActivityComment = { ...comment, id: newId("cmt"), createdAt: nowIso() };
          return { activities: replace(state.activities, activityId, { comments: [...act.comments, full] }) };
        });
      },

      publishActivity: (activityId, published) => {
        push(() => remote.setActivityPublished(activityId, published));
        set((state) => ({ activities: replace(state.activities, activityId, { published }) }));
      },

      // ---- notices -----------------------------------------------------
      markNoticeRead: (noticeId, userId) => {
        push(() => remote.markNoticeRead(noticeId));
        set((state) => {
          const notice = state.notices.find((n) => n.id === noticeId);
          if (!notice || notice.readBy.includes(userId)) return {};
          return { notices: replace(state.notices, noticeId, { readBy: [...notice.readBy, userId] }) };
        });
      },

      publishNotice: (noticeId, publish) => {
        push(() => remote.setNoticePublished(noticeId, publish));
        set((state) => ({
          notices: replace(state.notices, noticeId, { publishedAt: publish ? nowIso() : null }),
        }));
      },

      // ---- messaging ---------------------------------------------------
      sendMessage: (conversationId, msg) => {
        push(() =>
          remote.sendMessage(conversationId, {
            kind: msg.kind,
            body: msg.body,
            ...(msg.durationSec ? { durationSec: msg.durationSec } : {}),
          }),
        );
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
        });
      },

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
        push(async () => {
          const res = await remote.startConversation({
            studentId: conv.studentId,
            participantIds: conv.participantIds,
            parentName: conv.parentName,
            teacherName: conv.teacherName,
            subject: conv.subject,
            firstMessage,
          });
          // The thread the parent is now looking at has a temporary id; adopt
          // the server's before the next message is sent into a void.
          const realId = res?.conversation?.id;
          if (!realId) return;
          useErpStore.setState((state) => ({
            conversations: state.conversations.map((c) => (c.id === id ? { ...c, id: realId } : c)),
            messages: state.messages.map((m) =>
              m.conversationId === id ? { ...m, conversationId: realId } : m,
            ),
          }));
        });
        return id;
      },

      markConversationRead: (conversationId, side) => {
        push(() => remote.markConversationRead(conversationId));
        return set((state) => ({
          conversations: replace(
            state.conversations,
            conversationId,
            side === "parent" ? { unreadForParent: 0 } : { unreadForTeacher: 0 },
          ),
          messages: state.messages.map((m) =>
            m.conversationId === conversationId && !m.readAt ? { ...m, readAt: nowIso() } : m,
          ),
        }));
      },

      // ---- fees --------------------------------------------------------
      payInvoice: (invoiceId, amount, method) => {
        if (amount > 0) push(() => remote.payInvoice(invoiceId, amount, method));
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
        });
      },

      issueInvoice: (invoice) => {
        set((state) => ({ invoices: [invoice, ...state.invoices] }));
        push(async () => reconcile("invoices", invoice.id, await remote.createRecord("invoices", invoice)));
      },

      // ---- events ------------------------------------------------------
      rsvpEvent: (eventId, userId, name, guests) => {
        push(() => remote.rsvpEvent(eventId, guests));
        set((state) => {
          const ev = state.events.find((e) => e.id === eventId);
          if (!ev) return {};
          const rsvps = [...ev.rsvps.filter((r) => r.userId !== userId), { userId, name, guests }];
          return { events: replace(state.events, eventId, { rsvps }) };
        });
      },

      cancelRsvp: (eventId, userId) => {
        push(() => remote.cancelRsvp(eventId));
        set((state) => {
          const ev = state.events.find((e) => e.id === eventId);
          if (!ev) return {};
          return { events: replace(state.events, eventId, { rsvps: ev.rsvps.filter((r) => r.userId !== userId) }) };
        });
      },

      // ---- admissions --------------------------------------------------
      moveInquiry: (inquiryId, stage) => {
        push(() => remote.moveInquiry(inquiryId, stage));
        set((state) => ({ inquiries: replace(state.inquiries, inquiryId, { stage }) }));
      },

      addInquiryNote: (inquiryId, body, author) => {
        push(() => remote.addInquiryNote(inquiryId, body));
        set((state) => {
          const inq = state.inquiries.find((i) => i.id === inquiryId);
          if (!inq) return {};
          return {
            inquiries: replace(state.inquiries, inquiryId, {
              notes: [...inq.notes, { id: newId("n"), body, author, createdAt: nowIso() }],
            }),
          };
        });
      },

      setApplicationStatus: (applicationId, status, note) => {
        push(() => remote.setApplicationStatus(applicationId, status, note));
        set((state) => ({
          applications: replace(state.applications, applicationId, {
            status,
            ...(note !== undefined ? { decisionNote: note } : {}),
          }),
        }));
      },

      toggleApplicationDoc: (applicationId, docId) => {
        push(() => remote.toggleApplicationDoc(applicationId, docId));
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
        });
      },

      // ---- notifications ------------------------------------------------
      markNotificationRead: (id) => {
        push(() => remote.markNotificationRead(id));
        set((state) => ({ notifications: replace(state.notifications, id, { read: true }) }));
      },

      markAllNotificationsRead: (userId) => {
        push(() => remote.markAllNotificationsRead());
        set((state) => ({
          notifications: state.notifications.map((n) => (n.userId === userId ? { ...n, read: true } : n)),
        }));
      },

      setNotificationPreference: (patch) => {
        push(() => remote.setNotificationPreference(patch));
        set((state) => ({ notificationPreference: { ...state.notificationPreference, ...patch } }));
      },

      // ---- settings / audit ---------------------------------------------
      upsertMedicalProfile: (profile) => {
        push(() => remote.upsertMedicalProfile(profile.studentId, profile as unknown as Record<string, unknown>));
        set((state) => ({
          medicalProfiles: state.medicalProfiles.some((m) => m.studentId === profile.studentId)
            ? state.medicalProfiles.map((m) => (m.studentId === profile.studentId ? profile : m))
            : [...state.medicalProfiles, profile],
        }));
      },

      setRolePermissions: (role, permissions) => {
        push(() => remote.setRolePermissions(role, permissions));
        set((state) => ({
          roleDefinitions: state.roleDefinitions.map((d) => (d.role === role ? { ...d, permissions } : d)),
        }));
      },

      updateSettings: (patch) => {
        push(() => remote.updateSettings(patch));
        set((state) => ({ settings: { ...state.settings, ...patch } }));
      },

      toggleFeature: (key) => {
        const features = { ...get().settings.features, [key]: !get().settings.features[key] };
        push(() => remote.updateSettings({ features }));
        set((state) => ({ settings: { ...state.settings, features } }));
      },

      // Local only, and deliberately: the server writes its own audit entry
      // inside each mutating endpoint, which is the record that counts. This
      // one just keeps the admin's own screen current until the next refresh.
      logAudit: (entry) =>
        set((state) => ({
          auditEntries: [{ ...entry, id: newId("au"), createdAt: nowIso() }, ...state.auditEntries],
        })),

      // ---- kids zone -----------------------------------------------------
      finishGame: (studentId, gameSlug, score, stars, durationSec) => {
        push(() => remote.finishGame({ studentId, gameSlug, score, stars, durationSec }));
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
        push(() => remote.finishStory(studentId, storyId));
        const next: JourneyState = {
          ...journey,
          stars: journey.stars + 1,
          finishedStories: [...journey.finishedStories, storyId],
        };
        next.unlockedBadges = BADGES.filter((b) => next.stars >= b.requiredStars).map((b) => b.key);
        set((state) => ({ journeys: [...state.journeys.filter((j) => j.studentId !== studentId), next] }));
      },

      setMascot: (studentId, mascot) => {
        push(() => remote.setMascot(studentId, mascot));
        const journey = ensureJourney(get().journeys, studentId);
        set((state) => ({
          journeys: [...state.journeys.filter((j) => j.studentId !== studentId), { ...journey, mascot }],
        }));
      },

      saveArtwork: (studentId, title, dataUrl) => {
        const id = newId("art");
        set((state) => ({
          artworks: [{ id, studentId, title, dataUrl, createdAt: nowIso() }, ...state.artworks],
        }));
        push(async () =>
          reconcile("artworks", id, ((await remote.saveArtwork(studentId, title, dataUrl)) as {
            artwork?: Artwork;
          })?.artwork ?? null),
        );
      },

      // Was "throw away my local edits"; now it means "forget the cache and
      // ask the server again", which is the only honest reading once the
      // database owns the data.
      resetDemoData: () => {
        if (!apiEnabled()) {
          set({ ...buildDemoData() });
          return;
        }
        void get().refresh();
      },
    })),
);
