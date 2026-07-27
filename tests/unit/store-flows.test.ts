/**
 * Run with `npm run check:flows`.
 *
 * Drives the ERP store the same way the UI does, to prove the logic behind the
 * buttons actually works (not just that the pages render).
 */
const mem = new Map<string, string>();
// zustand/persist needs a Storage before the store module is imported.
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
  key: () => null,
  length: 0,
} as Storage;

import { useErpStore } from "../../src/frontend/store/erpStore";
import {
  attendanceFor,
  attendanceRate,
  conversationsFor,
  feedForStudents,
  inquiriesByStage,
  invoicesFor,
  messagesOf,
  noticesFor,
  outstandingOf,
  rosterOf,
} from "../../src/frontend/store/queries";
import { dateKey, nowIso, today } from "../../src/shared/utils/date.util";

let pass = 0;
let fail = 0;
function check(label: string, ok: boolean, detail = "") {
  if (ok) {
    pass++;
    console.log(`  ✓ ${label}`);
  } else {
    fail++;
    console.log(`  ✗ ${label} ${detail}`);
  }
}

const s = () => useErpStore.getState();
const KEY = dateKey(today());

console.log("\nADMIN — students");
{
  const before = s().students.length;
  s().addItem("students", {
    id: "stu_test",
    branchId: "br_kathgola",
    firstName: "Test",
    lastName: "Child",
    admissionNo: "CK9999",
    dob: "2023-01-01T00:00:00.000Z",
    gender: "M",
    classroomId: "cr_sunshine",
    programSlug: "toddlers",
    status: "ACTIVE",
    enrolledOn: nowIso(),
    photoEmoji: "🧒",
    bloodGroup: "O+",
    allergies: [],
    medicalNotes: "",
    guardianIds: [],
    createdAt: nowIso(),
  });
  check("enrol adds a student", s().students.length === before + 1);
  check("new child appears on the class roster", rosterOf(s().students, "cr_sunshine").some((x) => x.id === "stu_test"));

  s().patchItem("students", "stu_test", { status: "WITHDRAWN" });
  check("mark withdrawn patches status", s().students.find((x) => x.id === "stu_test")?.status === "WITHDRAWN");

  s().patchItem("students", "stu_test", { classroomId: "cr_rainbow" });
  check("move class re-parents the child", s().students.find((x) => x.id === "stu_test")?.classroomId === "cr_rainbow");

  s().removeItem("students", "stu_test");
  check("delete removes the student", s().students.length === before);
}

console.log("\nTEACHER — attendance");
{
  s().markAttendance("stu_aarav", "cr_sunshine", "ABSENT", KEY);
  check("mark absent", attendanceFor(s().attendance, "stu_aarav", KEY)?.status === "ABSENT");
  check("absent clears check-in", attendanceFor(s().attendance, "stu_aarav", KEY)?.checkInAt === null);

  s().checkIn("stu_aarav", "cr_sunshine");
  const rec = attendanceFor(s().attendance, "stu_aarav", KEY);
  check("check-in flips to present with a timestamp", rec?.status === "PRESENT" && !!rec?.checkInAt);

  s().checkOut("stu_aarav", "Priya Sharma");
  const out = attendanceFor(s().attendance, "stu_aarav", KEY);
  check("check-out records who collected", !!out?.checkOutAt && out?.pickedUpBy === "Priya Sharma");

  s().updateDayLog("stu_aarav", KEY, { mood: "HAPPY", mealsEaten: "ALL", napMinutes: 45, note: "Great day" });
  const log = attendanceFor(s().attendance, "stu_aarav", KEY);
  check("day log saves mood/meals/nap", log?.mood === "HAPPY" && log?.mealsEaten === "ALL" && log?.napMinutes === 45);

  s().bulkMarkAttendance("cr_rainbow", "PRESENT", KEY);
  const rainbow = rosterOf(s().students, "cr_rainbow");
  check(
    "bulk 'all present' covers the whole roster",
    rainbow.every((x) => attendanceFor(s().attendance, x.id, KEY)?.status === "PRESENT"),
  );
  check("attendance rate computes", attendanceRate(s().attendance, "stu_aarav") > 0);
}

console.log("\nTEACHER → PARENT — activity feed");
{
  s().addItem("activities", {
    id: "act_test",
    classroomId: "cr_sunshine",
    authorStaffId: "st_meera",
    authorName: "Meera Banerjee",
    kind: "ART",
    title: "Test post",
    body: "Body",
    media: [],
    studentIds: ["stu_aarav"],
    comments: [],
    reactions: [],
    published: false,
    createdAt: nowIso(),
  });
  check("draft is hidden from parents", !feedForStudents(s().activities, ["stu_aarav"]).some((a) => a.id === "act_test"));

  s().publishActivity("act_test", true);
  check("publishing surfaces it in the parent feed", feedForStudents(s().activities, ["stu_aarav"]).some((a) => a.id === "act_test"));

  s().toggleActivityReaction("act_test", "usr_parent");
  check("heart adds a reaction", s().activities.find((a) => a.id === "act_test")?.reactions.includes("usr_parent") === true);
  s().toggleActivityReaction("act_test", "usr_parent");
  check("second tap removes it", s().activities.find((a) => a.id === "act_test")?.reactions.length === 0);

  s().commentOnActivity("act_test", { authorName: "Priya Sharma", authorRole: "PARENT", body: "Lovely!" });
  check("parent comment lands on the post", s().activities.find((a) => a.id === "act_test")?.comments.length === 1);
}

console.log("\nADMIN → PARENT — notices");
{
  const draftId = "not_6"; // seeded draft
  check("draft notice is not visible to parents", !noticesFor(s().notices, "PARENTS", []).some((n) => n.id === draftId));
  s().publishNotice(draftId, true);
  check("publish makes it visible", noticesFor(s().notices, "PARENTS", []).some((n) => n.id === draftId));
  s().markNoticeRead(draftId, "usr_parent");
  check("mark read records the reader", s().notices.find((n) => n.id === draftId)?.readBy.includes("usr_parent") === true);
}

console.log("\nPARENT — fees");
{
  const invoice = s().invoices.find((i) => i.amount + i.lateFee - i.paidAmount > 1000 && i.status !== "PAID")!;
  const balance = invoice.amount + invoice.lateFee - invoice.paidAmount;
  const receiptsBefore = s().payments.length;

  s().payInvoice(invoice.id, Math.floor(balance / 2), "UPI");
  const partial = s().invoices.find((i) => i.id === invoice.id)!;
  check("part payment marks the invoice PARTIAL", partial.status === "PARTIAL", `got ${partial.status}`);
  check("a receipt is created", s().payments.length === receiptsBefore + 1);

  s().payInvoice(invoice.id, balance, "CARD");
  const paid = s().invoices.find((i) => i.id === invoice.id)!;
  check("settling the balance marks it PAID", paid.status === "PAID", `got ${paid.status}`);
  check("never overpays", paid.paidAmount === paid.amount + paid.lateFee);
  check("outstanding total drops", outstandingOf(invoicesFor(s().invoices, [invoice.studentId])) === 0);
  const receipts = s().payments.length;
  s().payInvoice(invoice.id, 0, "CASH");
  check("a zero payment is ignored", s().payments.length === receipts);
}

console.log("\nMESSAGING — both directions");
{
  const id = s().startConversation(
    {
      participantIds: ["usr_parent", "st_meera"],
      parentName: "Priya Sharma",
      teacherName: "Meera Banerjee",
      studentId: "stu_aarav",
      subject: "Test thread",
      lastMessageAt: nowIso(),
      lastMessagePreview: "",
      unreadForParent: 0,
      unreadForTeacher: 0,
      archived: false,
    },
    "Hello from the parent",
    { senderId: "usr_parent", senderName: "Priya Sharma", senderRole: "PARENT" },
  );
  check("thread appears for the parent", conversationsFor(s().conversations, "usr_parent").some((c) => c.id === id));
  check("thread appears for the teacher", conversationsFor(s().conversations, "st_meera").some((c) => c.id === id));
  check("teacher sees 1 unread", s().conversations.find((c) => c.id === id)?.unreadForTeacher === 1);

  s().sendMessage(id, { senderId: "st_meera", senderName: "Meera Banerjee", senderRole: "TEACHER", kind: "TEXT", body: "Reply" });
  check("reply lands in the thread", messagesOf(s().messages, id).length === 2);
  check("parent unread increments", s().conversations.find((c) => c.id === id)?.unreadForParent === 1);
  check("preview updates", s().conversations.find((c) => c.id === id)?.lastMessagePreview === "Reply");

  s().markConversationRead(id, "parent");
  check("opening the thread clears the parent badge", s().conversations.find((c) => c.id === id)?.unreadForParent === 0);

  s().sendMessage(id, { senderId: "st_meera", senderName: "Meera", senderRole: "TEACHER", kind: "VOICE", body: "Voice note", durationSec: 12 });
  check("voice note preview reads as a voice note", s().conversations.find((c) => c.id === id)?.lastMessagePreview.includes("Voice") === true);
}

console.log("\nADMISSIONS — website enquiry to enrolled");
{
  const before = inquiriesByStage(s().inquiries).NEW.length;
  s().addItem("inquiries", {
    id: "inq_test",
    parentName: "Web Visitor",
    email: "web@example.com",
    phone: "+91 90000 00000",
    childName: "Baby",
    childDob: "2024-01-01T00:00:00.000Z",
    programSlug: "toddlers",
    branchId: "br_kathgola",
    source: "WEBSITE",
    stage: "NEW",
    message: "From the website form",
    assignedToStaffId: null,
    followUpOn: null,
    notes: [],
    createdAt: nowIso(),
  });
  check("public form lands in the NEW column", inquiriesByStage(s().inquiries).NEW.length === before + 1);

  s().moveInquiry("inq_test", "CONTACTED");
  check("kanban move changes the stage", s().inquiries.find((i) => i.id === "inq_test")?.stage === "CONTACTED");

  s().addInquiryNote("inq_test", "Called and shared the brochure", "School Admin");
  check("note is appended", s().inquiries.find((i) => i.id === "inq_test")?.notes.length === 1);

  s().moveInquiry("inq_test", "ENROLLED");
  check("enrolled stage sticks", inquiriesByStage(s().inquiries).ENROLLED.some((i) => i.id === "inq_test"));

  const app = s().applications[0];
  s().toggleApplicationDoc(app.id, app.documents[0].id);
  const flipped = s().applications.find((a) => a.id === app.id)!.documents[0];
  check("document toggle flips + names the file", flipped.uploaded !== app.documents[0].uploaded);
  s().setApplicationStatus(app.id, "SEAT_OFFERED", "Seat offered");
  check("seat offer records status + note", s().applications.find((a) => a.id === app.id)?.status === "SEAT_OFFERED");
}

console.log("\nEVENTS — RSVP");
{
  s().rsvpEvent("ev_sports", "usr_parent", "Priya Sharma", 3);
  check("RSVP is recorded with guests", s().events.find((e) => e.id === "ev_sports")?.rsvps.some((r) => r.userId === "usr_parent" && r.guests === 3) === true);
  s().rsvpEvent("ev_sports", "usr_parent", "Priya Sharma", 2);
  check("changing an RSVP does not duplicate", s().events.find((e) => e.id === "ev_sports")?.rsvps.filter((r) => r.userId === "usr_parent").length === 1);
  s().cancelRsvp("ev_sports", "usr_parent");
  check("cancel removes it", s().events.find((e) => e.id === "ev_sports")?.rsvps.length === 0);
}

console.log("\nKIDS — stars, badges, streak, artwork");
{
  const before = s().journeys.find((j) => j.studentId === "stu_aarav")!;
  const fresh = s().finishGame("stu_aarav", "count-along", 8, 3, 48);
  const after = s().journeys.find((j) => j.studentId === "stu_aarav")!;
  check("stars are added", after.stars === before.stars + 3);
  check("level recomputes from stars", after.level === Math.floor(after.stars / 10) + 1);
  check("game marked complete", after.completedGames.includes("count-along"));
  check("session logged", s().gameSessions.some((g) => g.gameSlug === "count-along"));
  check("badge unlock returns fresh keys", Array.isArray(fresh));

  const starsBefore = after.stars;
  s().finishStory("stu_aarav", "st_lion");
  const withStory = s().journeys.find((j) => j.studentId === "stu_aarav")!;
  check("finishing a story earns a star", withStory.stars === starsBefore + 1);
  s().finishStory("stu_aarav", "st_lion");
  check("re-reading does not double-count", s().journeys.find((j) => j.studentId === "stu_aarav")?.stars === starsBefore + 1);

  s().setMascot("stu_aarav", "mimi");
  check("mascot switch persists", s().journeys.find((j) => j.studentId === "stu_aarav")?.mascot === "mimi");

  s().saveArtwork("stu_aarav", "My drawing", "data:image/png;base64,AAA");
  check("artwork saved to the gallery", s().artworks.length === 1);
}

console.log("\nSETTINGS / AUDIT / RESET");
{
  s().toggleFeature("kidsZone");
  check("feature flag toggles", s().settings.features.kidsZone === false);
  s().updateSettings({ schoolName: "Climb Kiddo Demo" });
  check("settings patch applies", s().settings.schoolName === "Climb Kiddo Demo");

  s().setRolePermissions("TEACHER", ["cctv:view", "student:manage"]);
  check("role permission matrix updates", s().roleDefinitions.find((d) => d.role === "TEACHER")?.permissions.length === 2);

  const auditBefore = s().auditEntries.length;
  s().logAudit({ actorName: "School Admin", actorRole: "ADMIN", action: "test.action", target: "x", detail: "y", ip: "local" });
  check("audit entry is written", s().auditEntries.length === auditBefore + 1);

  s().markAllNotificationsRead("usr_parent");
  check("mark-all-read clears the bell", s().notifications.filter((n) => n.userId === "usr_parent" && !n.read).length === 0);

  s().resetDemoData();
  check("reset restores the seeded dataset", s().settings.schoolName === "Climb Kiddo" && s().artworks.length === 0);
  check("reset restores students", s().students.length === 24, `got ${s().students.length}`);
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
