/**
 * Run with `npm run check:bootstrap`. Needs the seeded database up.
 *
 * One call hands a portal everything it may see, which is why it is also the
 * thing most likely to fall over as a school accumulates history. It used to
 * ask for every row: attendance is students × school days, so four hundred
 * children over a year is eighty thousand records in one JSON payload on every
 * load, and messages was the entire parent-teacher correspondence.
 *
 * A window only helps if it is actually applied, and that is easy to get wrong
 * in a way nothing notices — the seed spans a fortnight, so every collection
 * fits inside any sane window and a broken filter looks exactly like a working
 * one. So these tests plant a record outside the window and insist it is
 * missing, which is the only version of this test that can fail.
 */
import "dotenv/config";
import { bootstrapService } from "../../src/backend/services/bootstrap.service";
import { resolveScope, type Scope } from "../../src/backend/utils/scope.util";
import { prisma } from "../../src/backend/database/client";
import { ROLES } from "@/shared/constants/roles";

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

const dayKey = (daysAgo: number) =>
  new Date(Date.now() - daysAgo * 86_400_000).toISOString().slice(0, 10);

async function main() {
  const admin = await prisma.user.findFirst({ where: { role: ROLES.ADMIN } });
  if (!admin) throw new Error("Seed the database first — need an admin login.");

  const scope: Scope = await resolveScope({
    sub: admin.id,
    role: admin.role,
    email: admin.email,
    name: admin.name,
    branchId: admin.branchId,
  });

  const student = await prisma.student.findFirst({
    where: { branchId: admin.branchId ?? undefined, classroomId: { not: null }, status: "ACTIVE" },
  });
  if (!student) throw new Error("Need an active, placed student at the admin's branch.");

  // One record inside the window and one long outside it. 400 days is past any
  // plausible window without being so far out that it stops resembling data a
  // real school would hold. Upserted rather than created: there is one record
  // per child per day, and the seed already fills the recent ones.
  const mark = (date: string) =>
    prisma.attendanceRecord.upsert({
      where: { studentId_date: { studentId: student.id, date } },
      create: {
        studentId: student.id,
        classroomId: student.classroomId as string,
        date,
        status: "PRESENT",
      },
      update: { status: "PRESENT" },
    });

  const recentDate = dayKey(2);
  const ancientDate = dayKey(400);
  const recentExisted = await prisma.attendanceRecord.findUnique({
    where: { studentId_date: { studentId: student.id, date: recentDate } },
  });
  const recent = await mark(recentDate);
  const ancient = await mark(ancientDate);

  const conversation = await prisma.conversation.findFirst();
  const oldMessage = conversation
    ? await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: admin.id,
          senderName: admin.name,
          senderRole: "ADMIN",
          body: "a message from long ago",
          createdAt: new Date(Date.now() - 400 * 86_400_000),
        },
      })
    : null;

  try {
    const snap = await bootstrapService.snapshot(scope);

    console.log("\nCoverage is reported, not left to be guessed at");
    check("the snapshot says how far back it reaches", typeof snap.coverage?.since === "string");
    check("and which collections were capped", Array.isArray(snap.coverage?.truncated));
    // The screens read this to decide whether to say "these totals cover the
    // last N days". If the server ever stops naming the windowed collections,
    // the labels quietly disappear and every total reads as all-time again.
    check(
      "and which collections the window applies to",
      Array.isArray(snap.coverage?.windowed) && snap.coverage!.windowed.length > 0,
    );
    check(
      "attendance is named as windowed, because it is",
      snap.coverage!.windowed.includes("attendance"),
    );
    check("so are messages", snap.coverage!.windowed.includes("messages"));
    // Invoices are windowed for an admin (recent history plus everything still
    // owed) and not for a parent, who has few enough to send the lot. The
    // server says which, per role, so no screen has to guess.
    check(
      "an admin is told their invoices are windowed",
      snap.coverage!.windowed.includes("invoices"),
    );
    const since = new Date(snap.coverage!.since);
    check("the window is in the past", since.getTime() < Date.now());

    console.log("\nAn admin gets counts, not registers");
    // Attendance rows were 1.5MB of an admin's 2.39MB snapshot at four hundred
    // children, and every admin screen only ever added them up. They now get
    // the sums Postgres made instead — so the assertion is that the rows are
    // *absent* and the numbers are right, which is the opposite of what this
    // test used to insist on.
    check("no attendance rows are sent to an admin", snap.attendance.length === 0);
    check("a summary is sent instead", snap.attendanceSummary !== null);
    check(
      "and it counts the child we just marked present",
      (snap.attendanceSummary?.byStudent[student.id]?.marked ?? 0) > 0,
    );
    check(
      "the summary respects the same window",
      (snap.attendanceSummary?.since ?? "") >= snap.coverage!.since.slice(0, 10),
      `— summary from ${snap.attendanceSummary?.since}, window from ${snap.coverage!.since.slice(0, 10)}`,
    );

    console.log("\nAn admin's invoices: recent history, plus everything still owed");
    // The dangerous half of a window on invoices is the one it hides: an
    // invoice from two years ago that has never been paid is precisely the one
    // an office needs on screen.
    const oldStudent = student.id;
    const oldPaid = await prisma.invoice.create({
      data: {
        number: `TEST-PAID-${Date.now()}`,
        studentId: oldStudent,
        studentName: "Test Child",
        branchId: student.branchId,
        term: "Ancient term",
        amount: 1000,
        paidAmount: 1000,
        dueOn: daysAgoDate(400),
        issuedOn: daysAgoDate(400),
        status: "PAID",
      },
    });
    const oldUnpaid = await prisma.invoice.create({
      data: {
        number: `TEST-OWED-${Date.now()}`,
        studentId: oldStudent,
        studentName: "Test Child",
        branchId: student.branchId,
        term: "Ancient term",
        amount: 1000,
        dueOn: daysAgoDate(400),
        issuedOn: daysAgoDate(400),
        status: "OVERDUE",
      },
    });

    try {
      const withInvoices = await bootstrapService.snapshot(scope);
      const ids = new Set(withInvoices.invoices.map((i) => i.id));
      check("a settled invoice from 400 days ago is not carried", !ids.has(oldPaid.id));
      check("but one still owed from 400 days ago is", ids.has(oldUnpaid.id));
      check(
        "and the admin is told invoices are windowed, so the screen can say so",
        withInvoices.coverage!.windowed.includes("invoices"),
      );
    } finally {
      await prisma.invoice.deleteMany({ where: { id: { in: [oldPaid.id, oldUnpaid.id] } } });
    }

    console.log("\nThe window is actually applied — for the roles that get rows");
    // A teacher still receives registers: marking one needs each child's mood,
    // meals and nap, not a percentage.
    const teacherStaff = await prisma.staff.findFirst({
      where: { userId: { not: null }, classrooms: { some: {} } },
      include: { classrooms: true, user: true },
    });
    if (teacherStaff?.user) {
      const teacherSnap = await bootstrapService.snapshot(
        await resolveScope({
          sub: teacherStaff.user.id,
          role: ROLES.TEACHER,
          email: teacherStaff.user.email,
          name: teacherStaff.user.name,
          branchId: teacherStaff.branchId,
        }),
      );
      check("a teacher still gets rows", teacherSnap.attendance.length > 0);
      check("and no summary, because they have the rows", teacherSnap.attendanceSummary === null);

      const ids = new Set(teacherSnap.attendance.map((a) => a.id));
      check("a recent attendance record is present", ids.has(recent.id));
      check("a record from 400 days ago is not", !ids.has(ancient.id));

      // Every row that came back must respect the window, not just the one we
      // planted — a filter that happens to exclude our record while letting
      // others through is still broken.
      const oldest = teacherSnap.attendance.reduce<string | null>(
        (min, a) => (min === null || a.date < min ? a.date : min),
        null,
      );
      check(
        "nothing older than the window came back at all",
        oldest === null || oldest >= teacherSnap.coverage!.since.slice(0, 10),
        `— oldest was ${oldest}, window starts ${teacherSnap.coverage!.since.slice(0, 10)}`,
      );
    }

    if (oldMessage) {
      const messageIds = new Set(snap.messages.map((m) => m.id));
      check("a message from 400 days ago is not carried", !messageIds.has(oldMessage.id));
    }

    console.log("\nThreads still read in the right order");
    // The message query fetches newest-first so the cap bites on the recent
    // end, then reverses. Getting that reverse wrong would show every
    // conversation backwards.
    const byThread = new Map<string, string[]>();
    for (const m of snap.messages) {
      byThread.set(m.conversationId, [...(byThread.get(m.conversationId) ?? []), m.createdAt]);
    }
    const ordered = [...byThread.values()].every((times) =>
      times.every((t, i) => i === 0 || times[i - 1] <= t),
    );
    check("messages within a thread run oldest to newest", ordered);

    console.log("\nThe snapshot is still complete where it should be");
    check("reference data is not windowed", snap.branches.length > 0 && snap.classrooms.length > 0);
    check("students are all there", snap.students.length > 0);
    check("settings came through", typeof snap.settings === "object" && snap.settings !== null);
  } finally {
    // Only remove what this test brought into being; a seeded row stays.
    const plantedIds = [ancient.id, ...(recentExisted ? [] : [recent.id])];
    await prisma.attendanceRecord.deleteMany({ where: { id: { in: plantedIds } } });
    if (oldMessage) await prisma.message.delete({ where: { id: oldMessage.id } }).catch(() => {});
  }

  console.log(`\n${pass} passed, ${fail} failed\n`);
  await prisma.$disconnect();
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});

/** A Date n days back, for planting rows either side of a window. */
function daysAgoDate(n: number): Date {
  return new Date(Date.now() - n * 86_400_000);
}
