/**
 * Run with `npm run check:fees-attendance`. Needs the seeded database up.
 *
 * Money and the register — the two places where being wrong is visible to a
 * parent the same day.
 *
 * For fees the questions are: can an invoice be paid twice, can it be
 * overpaid, and can a gateway retry — which happens routinely, gateways resend
 * webhooks — be mistaken for a second payment. For attendance: can a teacher
 * mark a register that is not theirs.
 *
 * Everything here creates its own invoice and cleans it up, so the suite can be
 * run repeatedly without slowly filling the seed with test rows.
 */
import "dotenv/config";
import { prisma } from "../../src/backend/database/client";
import { feeService } from "../../src/backend/services/fee.service";
import { attendanceService } from "../../src/backend/services/attendance.service";
import { resolveScope, type Scope } from "../../src/backend/utils/scope.util";
import { ROLES, type Role } from "@/shared/constants/roles";

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

async function refuses(label: string, run: () => Promise<unknown>, expectCode?: string) {
  try {
    await run();
    check(label, false, "— it was allowed");
  } catch (e) {
    const code = (e as { code?: string }).code;
    const isAppError = e instanceof Error && (e.name === "AppError" || e.name === "ForbiddenError" || e.name === "NotFoundError");
    check(label, isAppError && (!expectCode || code === expectCode), `— threw ${(e as Error).name}/${code}`);
  }
}

function scopeOf(over: Partial<Scope> & { role: Role }): Scope {
  return {
    userId: "",
    name: "test",
    branchId: null,
    staffId: null,
    studentIds: [],
    classroomIds: [],
    ...over,
  };
}

const dayKey = (daysAgo: number) =>
  new Date(Date.now() - daysAgo * 86_400_000).toISOString().slice(0, 10);

async function main() {
  const admin = await prisma.user.findFirst({ where: { role: ROLES.ADMIN } });
  if (!admin) throw new Error("Seed the database first — need an admin login.");
  const adminScope = await resolveScope({
    sub: admin.id,
    role: admin.role,
    email: admin.email,
    name: admin.name,
    branchId: admin.branchId,
  });

  // At the admin's own branch: an admin may only touch children of their branch,
  // which the scoping suite pins down separately.
  const student = await prisma.student.findFirst({
    where: {
      status: "ACTIVE",
      classroomId: { not: null },
      ...(admin.branchId ? { branchId: admin.branchId } : {}),
    },
  });
  if (!student) throw new Error("Need an active, placed student at the admin's branch.");

  let invoiceId: string | null = null;

  try {
    console.log("\nAn invoice, and the one path money moves along");
    const invoice = await feeService.createInvoice(adminScope, {
      studentId: student.id,
      term: "TERM_1",
      dueOn: new Date().toISOString(),
      lateFee: 0,
      notes: "created by the integration suite",
      publish: true,
      lines: [{ label: "Test term fee", amount: 1000, qty: 1 }],
    });
    invoiceId = invoice.id;
    check("the invoice totals its lines", invoice.amount === 1000, `— got ${invoice.amount}`);
    check("and starts unpaid", invoice.paidAmount === 0);

    await refuses(
      "a teacher cannot list invoices",
      () => feeService.listInvoices(scopeOf({ role: ROLES.TEACHER })),
    );
    await refuses(
      "a parent cannot raise an invoice",
      () => feeService.createInvoice(scopeOf({ role: ROLES.PARENT }), {
        studentId: student.id,
        term: "TERM_1",
        dueOn: new Date().toISOString(),
        lateFee: 0,
        notes: "",
        publish: true,
        lines: [{ label: "x", amount: 1, qty: 1 }],
      }),
    );

    console.log("\nPaying more than is owed");
    await refuses(
      "an order for more than the balance is refused",
      () => feeService.createOrder(adminScope, invoice.id, 5000),
      "overpayment",
    );

    console.log("\nA part payment, then the rest");
    const part = await feeService.applyPayment(invoice.id, 400, "CASH", "part", null);
    check("the balance moves by exactly what was paid", part.invoice.paidAmount === 400);
    check("and the invoice reads as partly paid", part.invoice.status === "PARTIAL");

    // Paying more than the remainder must credit the remainder, not the amount
    // offered — otherwise the invoice reads as overpaid and the receipt lies.
    const rest = await feeService.applyPayment(invoice.id, 900, "CASH", "rest", null);
    check("an overpayment is trimmed to what was left", rest.invoice.paidAmount === 1000);
    check("the receipt records only what was applied", rest.payment.amount === 600, `— ${rest.payment.amount}`);
    check("and the invoice is settled", rest.invoice.status === "PAID");

    await refuses(
      "paying a settled invoice again is refused",
      () => feeService.applyPayment(invoice.id, 100, "CASH", "again", null),
      "already_paid",
    );
    await refuses(
      "a zero payment is refused",
      () => feeService.applyPayment(invoice.id, 0, "CASH", "nothing", null),
      "zero_payment",
    );
  } finally {
    if (invoiceId) {
      await prisma.payment.deleteMany({ where: { invoiceId } });
      await prisma.invoiceLine.deleteMany({ where: { invoiceId } });
      await prisma.invoice.delete({ where: { id: invoiceId } }).catch(() => {});
    }
  }

  console.log("\nA gateway that sends the same webhook twice");
  // Gateways retry. A retry is the same payment arriving again, and crediting it
  // twice would show a parent as having paid double.
  let secondInvoiceId: string | null = null;
  try {
    const invoice = await feeService.createInvoice(adminScope, {
      studentId: student.id,
      term: "TERM_2",
      dueOn: new Date().toISOString(),
      lateFee: 0,
      notes: "webhook replay test",
      publish: true,
      lines: [{ label: "Test term fee", amount: 800, qty: 1 }],
    });
    secondInvoiceId = invoice.id;

    const event = {
      orderId: "order_replay_test",
      paymentId: "pay_replay_test",
      amount: 800,
      status: "captured" as const,
      method: "UPI",
      notes: { invoiceId: invoice.id, studentId: student.id },
    };

    await feeService.handleGatewayEvent(event);
    const once = await prisma.invoice.findUniqueOrThrow({ where: { id: invoice.id } });
    check("the first delivery settles the invoice", once.paidAmount === 800);

    await feeService.handleGatewayEvent(event);
    const twice = await prisma.invoice.findUniqueOrThrow({ where: { id: invoice.id } });
    check("a replay does not credit it again", twice.paidAmount === 800, `— now ${twice.paidAmount}`);

    const payments = await prisma.payment.count({ where: { invoiceId: invoice.id } });
    check("and only one receipt exists", payments === 1, `— ${payments} receipts`);

    // A webhook with no invoice in its notes is not one of ours, and guessing
    // which invoice it meant would be worse than ignoring it. Asserting that it
    // "did not throw" would be a test that cannot fail — what matters is that no
    // invoice moved and no receipt appeared anywhere.
    const receiptsBefore = await prisma.payment.count();
    await feeService.handleGatewayEvent({ ...event, orderId: "order_orphan", notes: {} });
    check(
      "an orphan webhook creates no receipt anywhere",
      (await prisma.payment.count()) === receiptsBefore,
    );
    check(
      "and settles nothing",
      (await prisma.invoice.findUniqueOrThrow({ where: { id: invoice.id } })).paidAmount === 800,
    );

    // A failed payment must not move anything.
    await feeService.handleGatewayEvent({ ...event, orderId: "order_failed", status: "failed" });
    const afterFailed = await prisma.invoice.findUniqueOrThrow({ where: { id: invoice.id } });
    check("a failed payment moves nothing", afterFailed.paidAmount === 800);
  } finally {
    if (secondInvoiceId) {
      await prisma.payment.deleteMany({ where: { invoiceId: secondInvoiceId } });
      await prisma.invoiceLine.deleteMany({ where: { invoiceId: secondInvoiceId } });
      await prisma.invoice.delete({ where: { id: secondInvoiceId } }).catch(() => {});
    }
  }

  console.log("\nThe register belongs to whoever teaches it");
  const room = student.classroomId as string;
  const otherRoom = await prisma.classroom.findFirst({ where: { id: { not: room } } });
  const teacherOfRoom = scopeOf({ role: ROLES.TEACHER, classroomIds: [room] });

  const plantedDate = dayKey(370);
  try {
    const marked = await attendanceService.mark(teacherOfRoom, {
      studentId: student.id,
      classroomId: room,
      status: "PRESENT",
      date: plantedDate,
    });
    check("a teacher can mark their own room", marked.status === "PRESENT");

    if (otherRoom) {
      await refuses("a teacher cannot mark a room they do not teach", () =>
        attendanceService.mark(teacherOfRoom, {
          studentId: student.id,
          classroomId: otherRoom.id,
          status: "PRESENT",
          date: plantedDate,
        }),
      );
    }

    await refuses("a parent cannot mark the register at all", () =>
      attendanceService.mark(scopeOf({ role: ROLES.PARENT, studentIds: [student.id] }), {
        studentId: student.id,
        classroomId: room,
        status: "PRESENT",
        date: plantedDate,
      }),
    );

    // Marking twice is an edit, not a duplicate — one record per child per day.
    const remarked = await attendanceService.mark(teacherOfRoom, {
      studentId: student.id,
      classroomId: room,
      status: "ABSENT",
      date: plantedDate,
    });
    check("marking again edits the same record", remarked.id === marked.id);
    check("and the status changes", remarked.status === "ABSENT");
    check("an absent child has no arrival time", remarked.checkInAt === null);
  } finally {
    await prisma.attendanceRecord.deleteMany({
      where: { studentId: student.id, date: plantedDate },
    });
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
