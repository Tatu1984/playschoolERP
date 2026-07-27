/** Attendance, feed, notices, messaging, fees, events and admissions demo data. */
import type {
  Activity,
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
import type { AttendanceRecord, ChildMood } from "@/shared/types/school.types";
import { addDays, dateKey, daysAgo, daysAhead, hoursAgo, today } from "@/shared/utils/date.util";
import { seeded } from "@/shared/utils/common.util";
import { CLASSROOMS, STUDENTS } from "./school.fixture";

// --------------------------------------------------------------- attendance

const MOODS: ChildMood[] = ["HAPPY", "HAPPY", "CALM", "SLEEPY", "FUSSY"];

/** 21 school days back, weekends skipped, ~92% present. */
export const ATTENDANCE: AttendanceRecord[] = (() => {
  const rows: AttendanceRecord[] = [];
  for (let back = 0; back < 21; back++) {
    const day = addDays(today(), -back);
    const dow = day.getDay();
    if (dow === 0) continue; // Sunday off
    const key = dateKey(day);
    STUDENTS.forEach((s, si) => {
      const roll = seeded(back * 31 + si * 7);
      const isFuture = back === 0 && new Date().getHours() < 9;
      const status =
        s.status === "ON_LEAVE"
          ? "ABSENT"
          : isFuture
            ? "UNMARKED"
            : roll > 0.93
              ? "ABSENT"
              : roll > 0.88
                ? "LATE"
                : "PRESENT";
      const present = status === "PRESENT" || status === "LATE";
      rows.push({
        id: `att_${key}_${s.id}`,
        studentId: s.id,
        classroomId: s.classroomId ?? "",
        date: key,
        status,
        checkInAt: present ? daysAgo(back, status === "LATE" ? 9 : 8, status === "LATE" ? 35 : 50) : null,
        checkOutAt: present && back > 0 ? daysAgo(back, 13, 15) : null,
        pickedUpBy: present && back > 0 ? (s.primaryGuardianName ?? null) : null,
        markedByStaffId: CLASSROOMS.find((c) => c.id === s.classroomId)?.teacherId ?? null,
        note: status === "ABSENT" ? "Parent informed — unwell" : "",
        mood: present ? MOODS[Math.floor(seeded(si * 13 + back) * MOODS.length)] : null,
        mealsEaten: present ? (roll > 0.6 ? "ALL" : roll > 0.3 ? "MOST" : "SOME") : null,
        napMinutes: present ? Math.round(seeded(si + back) * 60) + 20 : null,
        createdAt: daysAgo(back, 9, 0),
      });
    });
  }
  return rows;
})();

// --------------------------------------------------------------- activity feed

function studentsIn(classroomId: string, count: number): string[] {
  return STUDENTS.filter((s) => s.classroomId === classroomId)
    .slice(0, count)
    .map((s) => s.id);
}

export const ACTIVITIES: Activity[] = [
  {
    id: "act_1",
    classroomId: "cr_sunshine",
    authorStaffId: "st_meera",
    authorName: "Meera Banerjee",
    kind: "ART",
    title: "Fingerprint butterflies 🦋",
    body: "Today we dipped little thumbs in paint and made butterflies. Aarav insisted his had eight wings — we let him have it. All the artwork is drying on the corridor wall, do peek in at pickup!",
    media: [
      { id: "m1", url: "", kind: "image", placeholder: "🎨", caption: "Paint trays ready" },
      { id: "m2", url: "", kind: "image", placeholder: "🦋", caption: "Aarav's eight-winged butterfly" },
    ],
    studentIds: studentsIn("cr_sunshine", 4),
    comments: [
      {
        id: "c1",
        authorName: "Priya Sharma",
        authorRole: "PARENT",
        body: "He came home and told us butterflies have eight wings. We are not correcting him. 😄",
        createdAt: hoursAgo(3),
      },
    ],
    reactions: ["usr_parent"],
    published: true,
    createdAt: hoursAgo(5),
  },
  {
    id: "act_2",
    classroomId: "cr_rainbow",
    authorStaffId: "st_ananya",
    authorName: "Ananya Ghosh",
    kind: "LEARNING",
    title: "Sound of the day: /s/",
    body: "Snake, sun, socks, soap. We hunted the classroom for /s/ things and found a surprising number of socks. Ask your child to hiss like a snake tonight.",
    media: [{ id: "m3", url: "", kind: "image", placeholder: "🐍" }],
    studentIds: studentsIn("cr_rainbow", 5),
    comments: [],
    reactions: [],
    published: true,
    createdAt: hoursAgo(7),
  },
  {
    id: "act_3",
    classroomId: "cr_sunshine",
    authorStaffId: "st_meera",
    authorName: "Meera Banerjee",
    kind: "MEAL",
    title: "Lunch report",
    body: "Khichdi and curd. Clean plates from almost everyone. Myra tried curd for the first time and approved.",
    media: [],
    studentIds: studentsIn("cr_sunshine", 4),
    comments: [],
    reactions: ["usr_parent"],
    published: true,
    createdAt: hoursAgo(9),
  },
  {
    id: "act_4",
    classroomId: "cr_blossom",
    authorStaffId: "st_rekha",
    authorName: "Rekha Dutta",
    kind: "OUTDOOR",
    title: "Obstacle course day",
    body: "Hoops, cones and a balance beam three inches off the ground that felt like a tightrope. Everyone finished. Everyone got a stamp.",
    media: [{ id: "m4", url: "", kind: "image", placeholder: "🤸" }],
    studentIds: studentsIn("cr_blossom", 5),
    comments: [],
    reactions: [],
    published: true,
    createdAt: daysAgo(1, 15, 20),
  },
  {
    id: "act_5",
    classroomId: "cr_starlight",
    authorStaffId: "st_farhan",
    authorName: "Farhan Alam",
    kind: "MUSIC",
    title: "Annual day rehearsal — first run",
    body: "First full run of the monsoon song. Rough in the middle, glorious at the end. Costumes go home next Friday.",
    media: [{ id: "m5", url: "", kind: "video", placeholder: "🎬", caption: "Rehearsal clip" }],
    studentIds: studentsIn("cr_starlight", 4),
    comments: [
      {
        id: "c2",
        authorName: "Ritika Malhotra",
        authorRole: "PARENT",
        body: "Shaurya has been singing it non-stop since Monday. Send help.",
        createdAt: daysAgo(1, 19, 0),
      },
      {
        id: "c3",
        authorName: "Farhan Alam",
        authorRole: "TEACHER",
        body: "That's the goal 😄",
        createdAt: daysAgo(1, 20, 10),
      },
    ],
    reactions: [],
    published: true,
    createdAt: daysAgo(1, 17, 0),
  },
  {
    id: "act_6",
    classroomId: "cr_sunshine",
    authorStaffId: "st_meera",
    authorName: "Meera Banerjee",
    kind: "NAP",
    title: "Quiet hour",
    body: "Lights low, lullaby on. 40 minutes of blessed silence.",
    media: [],
    studentIds: studentsIn("cr_sunshine", 4),
    comments: [],
    reactions: [],
    published: true,
    createdAt: daysAgo(2, 13, 30),
  },
  {
    id: "act_7",
    classroomId: "cr_meadow",
    authorStaffId: "st_sneha",
    authorName: "Sneha Roy",
    kind: "CELEBRATION",
    title: "Tara's birthday!",
    body: "Cupcakes, a paper crown and the birthday song in three languages. Thank you for the treats!",
    media: [{ id: "m6", url: "", kind: "image", placeholder: "🎂" }],
    studentIds: studentsIn("cr_meadow", 3),
    comments: [],
    reactions: [],
    published: true,
    createdAt: daysAgo(3, 11, 0),
  },
  {
    id: "act_8",
    classroomId: "cr_comet",
    authorStaffId: "st_arjun",
    authorName: "Arjun Mitra",
    kind: "PLAY",
    title: "Shop-shop corner",
    body: "We set up a vegetable shop. Real counting, pretend money, extremely serious negotiations.",
    media: [{ id: "m7", url: "", kind: "image", placeholder: "🥕" }],
    studentIds: studentsIn("cr_comet", 3),
    comments: [],
    reactions: [],
    published: true,
    createdAt: daysAgo(4, 12, 0),
  },
  {
    id: "act_9",
    classroomId: "cr_rainbow",
    authorStaffId: "st_ananya",
    authorName: "Ananya Ghosh",
    kind: "LEARNING",
    title: "Draft — number hunt photos",
    body: "Photos from the number hunt, still choosing which to publish.",
    media: [],
    studentIds: studentsIn("cr_rainbow", 5),
    comments: [],
    reactions: [],
    published: false,
    internalNote: "Wait for Ira's parents' media consent before publishing.",
    createdAt: hoursAgo(2),
  },
];

// --------------------------------------------------------------- notices

export const NOTICES: Notice[] = [
  {
    id: "not_1",
    title: "Annual Day — 15 August, 5 PM",
    body:
      "Our Annual Day is on 15 August at the Kathgola community hall. Doors open at 4:30 PM.\n\nEach family gets two seats; write to us if you need a third. Children must arrive in costume by 4:15 PM and report to their class teacher.",
    audience: "PARENTS",
    classroomId: null,
    branchId: null,
    priority: "IMPORTANT",
    publishedAt: daysAgo(2, 10, 0),
    expiresAt: daysAhead(20),
    authorName: "School Admin",
    attachments: [{ id: "a1", url: "", kind: "document", placeholder: "📄", caption: "Programme sheet" }],
    readBy: [],
    pinned: true,
    createdAt: daysAgo(2, 10, 0),
  },
  {
    id: "not_2",
    title: "Holiday: Independence Day",
    body: "School will remain closed on 15 August. Annual Day rehearsals resume on 16 August.",
    audience: "ALL",
    classroomId: null,
    branchId: null,
    priority: "NORMAL",
    publishedAt: daysAgo(4, 9, 0),
    expiresAt: daysAhead(25),
    authorName: "School Admin",
    attachments: [],
    readBy: ["usr_parent"],
    pinned: false,
    createdAt: daysAgo(4, 9, 0),
  },
  {
    id: "not_3",
    title: "Sunshine class — extra set of clothes",
    body: "We are doing water play every Wednesday this month. Please pack an extra set of clothes and a towel.",
    audience: "CLASSROOM",
    classroomId: "cr_sunshine",
    branchId: "br_kathgola",
    priority: "NORMAL",
    publishedAt: daysAgo(6, 16, 0),
    expiresAt: daysAhead(14),
    authorName: "Meera Banerjee",
    attachments: [],
    readBy: ["usr_parent"],
    pinned: false,
    createdAt: daysAgo(6, 16, 0),
  },
  {
    id: "not_4",
    title: "Term 2 fees due 10th",
    body: "Term 2 invoices are live in the app. Pay before the 10th to avoid the ₹50/day late fee.",
    audience: "PARENTS",
    classroomId: null,
    branchId: null,
    priority: "URGENT",
    publishedAt: daysAgo(1, 11, 0),
    expiresAt: daysAhead(9),
    authorName: "Iqbal Hossain",
    attachments: [],
    readBy: [],
    pinned: true,
    createdAt: daysAgo(1, 11, 0),
  },
  {
    id: "not_5",
    title: "Staff briefing — Monday 8 AM",
    body: "Annual Day duty roster and the new pickup protocol. Attendance mandatory for all teaching staff.",
    audience: "STAFF",
    classroomId: null,
    branchId: null,
    priority: "IMPORTANT",
    publishedAt: daysAgo(3, 18, 0),
    expiresAt: daysAhead(4),
    authorName: "School Admin",
    attachments: [],
    readBy: [],
    pinned: false,
    createdAt: daysAgo(3, 18, 0),
  },
  {
    id: "not_6",
    title: "Draft: Monsoon safety advisory",
    body: "Reminder about raincoats, spare footwear and the revised pickup queue when it rains.",
    audience: "PARENTS",
    classroomId: null,
    branchId: null,
    priority: "NORMAL",
    publishedAt: null,
    expiresAt: null,
    authorName: "School Admin",
    attachments: [],
    readBy: [],
    pinned: false,
    createdAt: hoursAgo(20),
  },
];

// --------------------------------------------------------------- messaging

export const CONVERSATIONS: Conversation[] = [
  {
    id: "cv_1",
    participantIds: ["usr_parent", "st_meera"],
    parentName: "Priya Sharma",
    teacherName: "Meera Banerjee",
    studentId: "stu_aarav",
    subject: "Aarav's nap routine",
    lastMessageAt: hoursAgo(1),
    lastMessagePreview: "We'll try the shorter nap from tomorrow.",
    unreadForParent: 1,
    unreadForTeacher: 0,
    archived: false,
    createdAt: daysAgo(3, 10, 0),
  },
  {
    id: "cv_2",
    participantIds: ["usr_parent", "st_admin"],
    parentName: "Priya Sharma",
    teacherName: "School Admin",
    studentId: "stu_aarav",
    subject: "Annual Day seats",
    lastMessageAt: daysAgo(1, 15, 0),
    lastMessagePreview: "Noted — three seats reserved for you.",
    unreadForParent: 0,
    unreadForTeacher: 0,
    archived: false,
    createdAt: daysAgo(2, 12, 0),
  },
  {
    id: "cv_3",
    participantIds: ["gd_ira", "st_ananya"],
    parentName: "Ritu Chatterjee",
    teacherName: "Ananya Ghosh",
    studentId: "stu_ira",
    subject: "Media consent",
    lastMessageAt: daysAgo(2, 9, 30),
    lastMessagePreview: "Happy for photos, please avoid video.",
    unreadForParent: 0,
    unreadForTeacher: 2,
    archived: false,
    createdAt: daysAgo(5, 9, 0),
  },
  {
    id: "cv_4",
    participantIds: ["gd_ayaan", "st_farhan"],
    parentName: "Farida Khan",
    teacherName: "Farhan Alam",
    studentId: "stu_ayaan",
    subject: "Costume size",
    lastMessageAt: daysAgo(6, 17, 0),
    lastMessagePreview: "Medium should be fine, thank you!",
    unreadForParent: 0,
    unreadForTeacher: 0,
    archived: true,
    createdAt: daysAgo(7, 10, 0),
  },
];

export const MESSAGES: Message[] = [
  {
    id: "msg_1",
    conversationId: "cv_1",
    senderId: "usr_parent",
    senderName: "Priya Sharma",
    senderRole: "PARENT",
    kind: "TEXT",
    body: "Hi Meera, Aarav has been up till 11 the last few nights. Could the school nap be a bit shorter?",
    createdAt: daysAgo(3, 10, 5),
    readAt: daysAgo(3, 10, 20),
  },
  {
    id: "msg_2",
    conversationId: "cv_1",
    senderId: "st_meera",
    senderName: "Meera Banerjee",
    senderRole: "TEACHER",
    kind: "TEXT",
    body: "Of course. He usually sleeps 12:30–1:30. We can wake him at 1:00 and give him quiet books instead.",
    createdAt: daysAgo(3, 11, 0),
    readAt: daysAgo(3, 11, 30),
  },
  {
    id: "msg_3",
    conversationId: "cv_1",
    senderId: "st_meera",
    senderName: "Meera Banerjee",
    senderRole: "TEACHER",
    kind: "VOICE",
    body: "Voice note",
    durationSec: 24,
    createdAt: hoursAgo(2),
    readAt: null,
  },
  {
    id: "msg_4",
    conversationId: "cv_1",
    senderId: "st_meera",
    senderName: "Meera Banerjee",
    senderRole: "TEACHER",
    kind: "TEXT",
    body: "We'll try the shorter nap from tomorrow.",
    createdAt: hoursAgo(1),
    readAt: null,
  },
  {
    id: "msg_5",
    conversationId: "cv_2",
    senderId: "usr_parent",
    senderName: "Priya Sharma",
    senderRole: "PARENT",
    kind: "TEXT",
    body: "Could we get a third seat for Annual Day? Aarav's grandmother is visiting.",
    createdAt: daysAgo(2, 12, 5),
    readAt: daysAgo(2, 12, 40),
  },
  {
    id: "msg_6",
    conversationId: "cv_2",
    senderId: "st_admin",
    senderName: "School Admin",
    senderRole: "ADMIN",
    kind: "TEXT",
    body: "Noted — three seats reserved for you.",
    createdAt: daysAgo(1, 15, 0),
    readAt: daysAgo(1, 15, 10),
  },
  {
    id: "msg_7",
    conversationId: "cv_3",
    senderId: "gd_ira",
    senderName: "Ritu Chatterjee",
    senderRole: "PARENT",
    kind: "TEXT",
    body: "Happy for photos, please avoid video.",
    createdAt: daysAgo(2, 9, 30),
    readAt: null,
  },
  {
    id: "msg_8",
    conversationId: "cv_4",
    senderId: "gd_ayaan",
    senderName: "Farida Khan",
    senderRole: "PARENT",
    kind: "TEXT",
    body: "Medium should be fine, thank you!",
    createdAt: daysAgo(6, 17, 0),
    readAt: daysAgo(6, 17, 30),
  },
];

export const MEETINGS: Meeting[] = [
  {
    id: "mt_1",
    studentId: "stu_aarav",
    teacherName: "Meera Banerjee",
    parentName: "Priya Sharma",
    mode: "VIDEO",
    scheduledFor: daysAhead(3, 17, 0),
    durationMin: 20,
    agenda: "Term 1 progress + sleep routine",
    status: "CONFIRMED",
    joinUrl: "https://meet.climbkiddo.in/aarav-term1",
    createdAt: daysAgo(2, 10, 0),
  },
  {
    id: "mt_2",
    studentId: "stu_ira",
    teacherName: "Ananya Ghosh",
    parentName: "Ritu Chatterjee",
    mode: "IN_PERSON",
    scheduledFor: daysAhead(5, 16, 30),
    durationMin: 15,
    agenda: "Speech development check-in",
    status: "REQUESTED",
    createdAt: hoursAgo(30),
  },
  {
    id: "mt_3",
    studentId: "stu_shaurya",
    teacherName: "Farhan Alam",
    parentName: "Ritika Malhotra",
    mode: "PHONE",
    scheduledFor: daysAgo(4, 18, 0),
    durationMin: 15,
    agenda: "Annual day solo part",
    status: "COMPLETED",
    createdAt: daysAgo(8, 12, 0),
  },
];

// --------------------------------------------------------------- fees

export const FEE_STRUCTURES: FeeStructure[] = [
  { id: "fs_1", programSlug: "toddlers", branchId: "br_kathgola", admissionFee: 12000, termFee: 18000, transportFee: 3500, mealFee: 2500, activityFee: 1500, termsPerYear: 3, lateFeePerDay: 50, createdAt: daysAgo(200) },
  { id: "fs_2", programSlug: "nursery", branchId: "br_kathgola", admissionFee: 14000, termFee: 21000, transportFee: 3500, mealFee: 2500, activityFee: 2000, termsPerYear: 3, lateFeePerDay: 50, createdAt: daysAgo(200) },
  { id: "fs_3", programSlug: "junior-kg", branchId: "br_kathgola", admissionFee: 15000, termFee: 24000, transportFee: 3500, mealFee: 2800, activityFee: 2200, termsPerYear: 3, lateFeePerDay: 50, createdAt: daysAgo(200) },
  { id: "fs_4", programSlug: "senior-kg", branchId: "br_kathgola", admissionFee: 15000, termFee: 26000, transportFee: 3500, mealFee: 2800, activityFee: 2500, termsPerYear: 3, lateFeePerDay: 50, createdAt: daysAgo(200) },
  { id: "fs_5", programSlug: "nursery", branchId: "br_dhakuria", admissionFee: 12000, termFee: 19000, transportFee: 3000, mealFee: 2400, activityFee: 1800, termsPerYear: 3, lateFeePerDay: 40, createdAt: daysAgo(180) },
  { id: "fs_6", programSlug: "junior-kg", branchId: "br_dhakuria", admissionFee: 13000, termFee: 22000, transportFee: 3000, mealFee: 2400, activityFee: 2000, termsPerYear: 3, lateFeePerDay: 40, createdAt: daysAgo(180) },
];

const TERM_FEE: Record<string, number> = {
  toddlers: 18000,
  nursery: 21000,
  "junior-kg": 24000,
  "senior-kg": 26000,
  "summer-camp": 12000,
  abacus: 9000,
  "activity-club": 7000,
};

/** One Term-2 invoice per student: ~60% paid, some partial, a few overdue. */
export const INVOICES: Invoice[] = STUDENTS.map((s, i) => {
  const base = TERM_FEE[s.programSlug] ?? 20000;
  const meal = 2500;
  const activity = 2000;
  const amount = base + meal + activity;
  const roll = seeded(i * 17 + 3);
  const overdue = roll > 0.86;
  const partial = !overdue && roll > 0.68;
  const paid = !overdue && !partial && roll > 0.28;
  const paidAmount = paid ? amount : partial ? Math.round(amount * 0.5) : 0;
  return {
    id: `inv_${s.id}`,
    number: `CK/T2/${1000 + i}`,
    studentId: s.id,
    studentName: `${s.firstName} ${s.lastName}`,
    branchId: s.branchId,
    term: "Term 2 · 2026-27",
    lines: [
      { id: `l1_${i}`, label: "Term fee", amount: base, qty: 1 },
      { id: `l2_${i}`, label: "Meals", amount: meal, qty: 1 },
      { id: `l3_${i}`, label: "Activity kit", amount: activity, qty: 1 },
    ],
    amount,
    paidAmount,
    lateFee: overdue ? 250 : 0,
    dueOn: overdue ? daysAgo(5) : daysAhead(9),
    status: paid ? "PAID" : partial ? "PARTIAL" : overdue ? "OVERDUE" : "SENT",
    issuedOn: daysAgo(20),
    notes: "",
    createdAt: daysAgo(20),
  };
});

export const PAYMENTS: Payment[] = INVOICES.filter((inv) => inv.paidAmount > 0).map((inv, i) => ({
  id: `pay_${inv.id}`,
  invoiceId: inv.id,
  studentId: inv.studentId,
  amount: inv.paidAmount,
  method: (["UPI", "CARD", "NETBANKING", "CASH"] as const)[i % 4],
  reference: `RZP${900000 + i * 37}`,
  paidAt: daysAgo(15 - (i % 12)),
  receiptNo: `RCPT/${2000 + i}`,
  gatewayOrderId: `order_${(900000 + i * 37).toString(36)}`,
  createdAt: daysAgo(15 - (i % 12)),
}));

// --------------------------------------------------------------- events

export const EVENTS: SchoolEvent[] = [
  {
    id: "ev_annual",
    slug: "annual-day-2026",
    title: "Annual Day — Little Big Show",
    description:
      "Our biggest evening of the year. Every child performs, every parent cries a little. Monsoon-themed this time, with a finale involving 40 paper umbrellas.",
    kind: "CELEBRATION",
    startsAt: daysAhead(19, 17, 0),
    endsAt: daysAhead(19, 20, 0),
    venue: "Kathgola Community Hall",
    branchId: "br_kathgola",
    coverEmoji: "🎭",
    media: [],
    rsvpEnabled: true,
    rsvps: [{ userId: "usr_parent", guests: 3, name: "Priya Sharma" }],
    published: true,
    createdAt: daysAgo(30),
  },
  {
    id: "ev_sports",
    slug: "sports-day-2026",
    title: "Sports Day",
    description: "Sack races, spoon races, and a parents' relay that gets far too competitive.",
    kind: "SPORTS",
    startsAt: daysAhead(33, 8, 30),
    endsAt: daysAhead(33, 12, 0),
    venue: "Beleghata Ground",
    branchId: null,
    coverEmoji: "🏃",
    media: [],
    rsvpEnabled: true,
    rsvps: [],
    published: true,
    createdAt: daysAgo(20),
  },
  {
    id: "ev_ptm",
    slug: "ptm-term-2",
    title: "Parent–Teacher Meeting (Term 2)",
    description: "15-minute slots per family. Book your slot from the app — slots open a week prior.",
    kind: "PTM",
    startsAt: daysAhead(9, 9, 0),
    endsAt: daysAhead(9, 14, 0),
    venue: "Respective classrooms",
    branchId: null,
    coverEmoji: "🗣️",
    media: [],
    rsvpEnabled: true,
    rsvps: [],
    published: true,
    createdAt: daysAgo(12),
  },
  {
    id: "ev_artcomp",
    slug: "monsoon-art-competition",
    title: "Monsoon Art Competition",
    description: "Crayons, colours and a lot of grey clouds. Judged by a local illustrator.",
    kind: "COMPETITION",
    startsAt: daysAgo(9, 10, 0),
    endsAt: daysAgo(9, 12, 0),
    venue: "Kathgola campus",
    branchId: "br_kathgola",
    coverEmoji: "🖼️",
    media: [
      { id: "em1", url: "", kind: "image", placeholder: "🖼️", caption: "Winning entry" },
      { id: "em2", url: "", kind: "image", placeholder: "☔" },
    ],
    rsvpEnabled: false,
    rsvps: [],
    published: true,
    createdAt: daysAgo(40),
  },
  {
    id: "ev_workshop",
    slug: "parenting-workshop-screen-time",
    title: "Parenting Workshop: Screen Time",
    description: "A child psychologist on what screens do to under-6 brains, and what to do about it.",
    kind: "WORKSHOP",
    startsAt: daysAhead(6, 18, 0),
    endsAt: daysAhead(6, 19, 30),
    venue: "Online (Zoom)",
    branchId: null,
    coverEmoji: "📱",
    media: [],
    rsvpEnabled: true,
    rsvps: [],
    published: true,
    createdAt: daysAgo(8),
  },
  {
    id: "ev_trip",
    slug: "zoo-trip",
    title: "Field Trip — Alipore Zoo",
    description: "Senior KG only. Packed lunch, two teachers per six children, back by 2 PM.",
    kind: "TRIP",
    startsAt: daysAhead(14, 8, 0),
    endsAt: daysAhead(14, 14, 0),
    venue: "Alipore Zoological Gardens",
    branchId: "br_kathgola",
    coverEmoji: "🦁",
    media: [],
    rsvpEnabled: true,
    rsvps: [],
    published: true,
    createdAt: daysAgo(5),
  },
  {
    id: "ev_holiday",
    slug: "independence-day",
    title: "Holiday — Independence Day",
    description: "School closed. Flag hoisting at 8 AM for those who wish to join.",
    kind: "HOLIDAY",
    startsAt: daysAhead(19, 8, 0),
    endsAt: daysAhead(19, 9, 0),
    venue: "Both campuses",
    branchId: null,
    coverEmoji: "🇮🇳",
    media: [],
    rsvpEnabled: false,
    rsvps: [],
    published: true,
    createdAt: daysAgo(15),
  },
  {
    id: "ev_draft",
    slug: "diwali-mela",
    title: "Diwali Mela (draft)",
    description: "Stalls, diya painting and a no-crackers pledge. Dates to be confirmed.",
    kind: "CELEBRATION",
    startsAt: daysAhead(95, 17, 0),
    endsAt: daysAhead(95, 20, 0),
    venue: "TBD",
    branchId: null,
    coverEmoji: "🪔",
    media: [],
    rsvpEnabled: false,
    rsvps: [],
    published: false,
    createdAt: daysAgo(2),
  },
];

// --------------------------------------------------------------- admissions

const INQUIRY_SEEDS: {
  parent: string;
  child: string;
  program: Inquiry["programSlug"];
  stage: Inquiry["stage"];
  source: Inquiry["source"];
  branchId: string;
  days: number;
}[] = [
  { parent: "Sudeshna Pal", child: "Ridhi", program: "nursery", stage: "NEW", source: "WEBSITE", branchId: "br_kathgola", days: 0 },
  { parent: "Amitava Sen", child: "Ahaan", program: "toddlers", stage: "NEW", source: "SOCIAL", branchId: "br_kathgola", days: 1 },
  { parent: "Rina Mukherjee", child: "Tiyasha", program: "junior-kg", stage: "CONTACTED", source: "REFERRAL", branchId: "br_dhakuria", days: 2 },
  { parent: "Karan Thakur", child: "Ishaan", program: "nursery", stage: "CONTACTED", source: "PHONE", branchId: "br_kathgola", days: 3 },
  { parent: "Fatima Sheikh", child: "Amira", program: "toddlers", stage: "VISIT_SCHEDULED", source: "WEBSITE", branchId: "br_kathgola", days: 4 },
  { parent: "Debasis Nandi", child: "Rian", program: "senior-kg", stage: "VISIT_SCHEDULED", source: "WALK_IN", branchId: "br_kathgola", days: 5 },
  { parent: "Meghna Bhowmick", child: "Aarna", program: "nursery", stage: "APPLICATION", source: "CAMPAIGN", branchId: "br_dhakuria", days: 7 },
  { parent: "Sujoy Kar", child: "Dhruv", program: "junior-kg", stage: "APPLICATION", source: "WEBSITE", branchId: "br_kathgola", days: 9 },
  { parent: "Pallavi Rao", child: "Nitya", program: "toddlers", stage: "ENROLLED", source: "REFERRAL", branchId: "br_kathgola", days: 14 },
  { parent: "Hasan Ali", child: "Zayan", program: "nursery", stage: "ENROLLED", source: "WALK_IN", branchId: "br_dhakuria", days: 18 },
  { parent: "Trisha Guha", child: "Rohan", program: "senior-kg", stage: "LOST", source: "WEBSITE", branchId: "br_kathgola", days: 22 },
  { parent: "Vikram Chauhan", child: "Aarush", program: "junior-kg", stage: "LOST", source: "PHONE", branchId: "br_dhakuria", days: 26 },
];

export const INQUIRIES: Inquiry[] = INQUIRY_SEEDS.map((s, i) => ({
  id: `inq_${i + 1}`,
  parentName: s.parent,
  email: `${s.parent.toLowerCase().replace(/[^a-z]/g, ".")}@example.com`,
  phone: `+91 91${`${23456780 + i * 91}`.slice(0, 8)}`,
  childName: s.child,
  childDob: daysAgo(900 + i * 40),
  programSlug: s.program,
  branchId: s.branchId,
  source: s.source,
  stage: s.stage,
  message:
    i % 3 === 0
      ? "Looking for a warm, small-batch playschool near Beleghata. Could we visit this week?"
      : i % 3 === 1
        ? "What are the timings and the fee structure for the next term?"
        : "A friend's child studies here and recommended it. Please share admission details.",
  assignedToStaffId: i % 2 === 0 ? "st_iqbal" : "st_admin",
  followUpOn: s.stage === "LOST" || s.stage === "ENROLLED" ? null : daysAhead((i % 4) + 1),
  notes:
    s.stage === "NEW"
      ? []
      : [
          {
            id: `n_${i}`,
            body: "Called and shared the brochure. Interested in the morning batch.",
            createdAt: daysAgo(s.days - 1 > 0 ? s.days - 1 : 0, 12, 0),
            author: "Iqbal Hossain",
          },
        ],
  createdAt: daysAgo(s.days, 10, 30),
}));

const DOC_SET = ["Birth certificate", "Aadhaar copy", "Vaccination record", "Passport photo", "Address proof"];

export const APPLICATIONS: Application[] = [
  { inq: "inq_7", name: "Aarna Bhowmick", program: "nursery" as const, branch: "br_dhakuria", parent: "Meghna Bhowmick", status: "UNDER_REVIEW" as const, uploaded: 4, days: 6 },
  { inq: "inq_8", name: "Dhruv Kar", program: "junior-kg" as const, branch: "br_kathgola", parent: "Sujoy Kar", status: "DOCS_PENDING" as const, uploaded: 2, days: 8 },
  { inq: "inq_9", name: "Nitya Rao", program: "toddlers" as const, branch: "br_kathgola", parent: "Pallavi Rao", status: "ACCEPTED" as const, uploaded: 5, days: 13 },
  { inq: "inq_10", name: "Zayan Ali", program: "nursery" as const, branch: "br_dhakuria", parent: "Hasan Ali", status: "SEAT_OFFERED" as const, uploaded: 5, days: 17 },
  { inq: null, name: "Ishita Bardhan", program: "senior-kg" as const, branch: "br_kathgola", parent: "Rupali Bardhan", status: "SUBMITTED" as const, uploaded: 1, days: 1 },
  { inq: "inq_11", name: "Rohan Guha", program: "senior-kg" as const, branch: "br_kathgola", parent: "Trisha Guha", status: "REJECTED" as const, uploaded: 3, days: 21 },
].map((a, i) => ({
  id: `app_${i + 1}`,
  inquiryId: a.inq,
  applicationNo: `APP/2026/${210 + i}`,
  childName: a.name,
  childDob: daysAgo(1100 + i * 60),
  programSlug: a.program,
  branchId: a.branch,
  parentName: a.parent,
  email: `${a.parent.toLowerCase().replace(/[^a-z]/g, ".")}@example.com`,
  phone: `+91 93${`${11223340 + i * 77}`.slice(0, 8)}`,
  address: i % 2 ? "Dhakuria, Kolkata 700031" : "Beleghata, Kolkata 700010",
  status: a.status,
  documents: DOC_SET.map((label, di) => ({
    id: `doc_${i}_${di}`,
    label,
    uploaded: di < a.uploaded,
    fileName: di < a.uploaded ? `${label.toLowerCase().replace(/ /g, "-")}.pdf` : undefined,
  })),
  submittedOn: daysAgo(a.days, 11, 0),
  decisionNote:
    a.status === "REJECTED"
      ? "No seat available in Senior KG for this term. Waitlisted for next intake."
      : a.status === "ACCEPTED"
        ? "Seat confirmed. Admission fee received."
        : "",
  createdAt: daysAgo(a.days, 11, 0),
}));

export const VISIT_BOOKINGS: VisitBooking[] = [
  { id: "vb_1", parentName: "Fatima Sheikh", phone: "+91 91234 56789", email: "fatima.sheikh@example.com", branchId: "br_kathgola", date: dateKey(addDays(today(), 1)), slot: "10:30", childAge: 2, mode: "CAMPUS", status: "CONFIRMED", note: "Will bring the child along.", createdAt: daysAgo(4) },
  { id: "vb_2", parentName: "Debasis Nandi", phone: "+91 91234 11111", email: "debasis.nandi@example.com", branchId: "br_kathgola", date: dateKey(addDays(today(), 2)), slot: "12:00", childAge: 5, mode: "CAMPUS", status: "REQUESTED", note: "", createdAt: daysAgo(5) },
  { id: "vb_3", parentName: "Rina Mukherjee", phone: "+91 91234 22222", email: "rina.mukherjee@example.com", branchId: "br_dhakuria", date: dateKey(addDays(today(), 3)), slot: "11:00", childAge: 4, mode: "VIDEO", status: "REQUESTED", note: "Prefers a video walkthrough first.", createdAt: daysAgo(2) },
  { id: "vb_4", parentName: "Pallavi Rao", phone: "+91 91234 33333", email: "pallavi.rao@example.com", branchId: "br_kathgola", date: dateKey(addDays(today(), -6)), slot: "10:00", childAge: 2, mode: "CAMPUS", status: "COMPLETED", note: "Enrolled after the visit.", createdAt: daysAgo(10) },
  { id: "vb_5", parentName: "Vikram Chauhan", phone: "+91 91234 44444", email: "vikram.chauhan@example.com", branchId: "br_dhakuria", date: dateKey(addDays(today(), -3)), slot: "16:00", childAge: 4, mode: "CAMPUS", status: "CANCELLED", note: "Relocating out of the city.", createdAt: daysAgo(9) },
];
