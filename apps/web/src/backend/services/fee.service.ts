/**
 * Fees, invoices and payments (SoW §6.3, §7.10).
 *
 * The rules that protect the school's books:
 *
 *  * A payment can never exceed what is outstanding, and a zero-rupee submit
 *    can never mint a receipt or flip an invoice to PAID.
 *  * The gateway is the source of truth for money: a card payment is only
 *    recorded once the webhook arrives and its signature verifies. The
 *    "pay now" endpoint creates an order; it does not mark anything paid.
 *  * Cash and cheque are recorded by staff directly, because there is no
 *    gateway involved and someone at the desk took the money.
 *  * Receipt numbers are issued inside the transaction, so two parents paying
 *    at once cannot both be RCPT/3007.
 */
import { prisma, type Prisma } from "@/backend/database/client";
import { feeRepository } from "@/backend/repositories/fee.repository";
import { toFeeStructure, toInvoice, toPayment } from "@/backend/mappers";
import { paymentGateway, type PaymentEvent, type PaymentOrder } from "@/backend/integrations/payments";
import { AppError, ForbiddenError, NotFoundError } from "@/backend/utils/error-handler.util";
import { logger } from "@/backend/utils/logger.util";
import { requireRole } from "@/backend/utils/rbac.util";
import { canSeeStudent, type Scope } from "@/backend/utils/scope.util";
import { ROLES, type Role } from "@/shared/constants/roles";
import type { FeeStructure, Invoice, Payment, PaymentMethod } from "@/shared/types/engagement.types";
import type {
  CreateInvoiceInput,
  FeeStructureInput,
  RecordPaymentInput,
} from "@/backend/validators/fee.validator";

const ADMINS: Role[] = [ROLES.SUPER_ADMIN, ROLES.ADMIN];
/** Methods a staff member may record without a gateway round-trip. */
const OFFLINE_METHODS: PaymentMethod[] = ["CASH", "CHEQUE"];

const outstandingOf = (inv: { amount: number; lateFee: number; paidAmount: number }) =>
  inv.amount + inv.lateFee - inv.paidAmount;

export const feeService = {
  invoiceWhere(
    scope: Scope,
    filters: { studentId?: string; status?: string; issuedSince?: string } = {},
  ) {
    const where: Prisma.InvoiceWhereInput = {};
    if (filters.status) where.status = filters.status as Prisma.InvoiceWhereInput["status"];
    if (filters.issuedSince) {
      // "Recent history, plus everything still owed."
      //
      // A window on its own would hide an invoice from two years ago that has
      // never been paid, which is exactly the one an office needs to see. So
      // the cut is by date OR unsettled, never by date alone.
      where.OR = [
        { issuedOn: { gte: new Date(filters.issuedSince) } },
        { status: { notIn: ["PAID", "CANCELLED"] } },
      ];
    }
    if (scope.role === ROLES.PARENT) {
      where.studentId = filters.studentId && scope.studentIds.includes(filters.studentId)
        ? filters.studentId
        : { in: scope.studentIds };
    } else {
      if (filters.studentId) where.studentId = filters.studentId;
      if (scope.branchId) where.branchId = scope.branchId;
    }
    return where;
  },

  async listInvoices(
    scope: Scope,
    filters: { studentId?: string; status?: string; issuedSince?: string } = {},
    limit?: number,
  ): Promise<Invoice[]> {
    if (scope.role === ROLES.TEACHER) throw new ForbiddenError("Fees are not a teacher's business");
    return (await feeRepository.listInvoices(this.invoiceWhere(scope, filters), limit)).map(toInvoice);
  },

  async getInvoice(scope: Scope, id: string): Promise<Invoice> {
    const row = await feeRepository.findInvoice(id);
    if (!row) throw new NotFoundError("Invoice not found");
    if (!(await canSeeStudent(scope, row.studentId))) throw new ForbiddenError();
    return toInvoice(row);
  },

  /** What a parent's dashboard shows: due now, overdue, and next due date. */
  async summary(scope: Scope, studentId?: string) {
    const invoices = await this.listInvoices(scope, { studentId });
    const open = invoices.filter((i) => i.status !== "PAID" && i.status !== "CANCELLED");
    const today = new Date().toISOString().slice(0, 10);
    return {
      outstanding: open.reduce((sum, i) => sum + outstandingOf(i), 0),
      overdue: open
        .filter((i) => i.dueOn.slice(0, 10) < today)
        .reduce((sum, i) => sum + outstandingOf(i), 0),
      nextDueOn: open.map((i) => i.dueOn).sort()[0] ?? null,
      invoiceCount: open.length,
    };
  },

  async listPayments(scope: Scope, studentId?: string, limit?: number): Promise<Payment[]> {
    const where: Prisma.PaymentWhereInput = {};
    if (scope.role === ROLES.PARENT) where.studentId = { in: scope.studentIds };
    else if (studentId) where.studentId = studentId;
    else if (scope.branchId) where.invoice = { branchId: scope.branchId };
    return (await feeRepository.listPayments(where, limit)).map(toPayment);
  },

  async listStructures(scope: Scope): Promise<FeeStructure[]> {
    const where = scope.branchId && scope.role !== ROLES.SUPER_ADMIN ? { branchId: scope.branchId } : {};
    return (await feeRepository.listStructures(where)).map(toFeeStructure);
  },

  async upsertStructure(scope: Scope, input: FeeStructureInput): Promise<FeeStructure> {
    requireRole(scope.role, ADMINS);
    const row = await feeRepository.upsertStructure(input.branchId, input.programSlug, input);
    return toFeeStructure(row);
  },

  async createInvoice(scope: Scope, input: CreateInvoiceInput): Promise<Invoice> {
    requireRole(scope.role, ADMINS);
    const student = await prisma.student.findUnique({
      where: { id: input.studentId },
      select: { firstName: true, lastName: true, branchId: true },
    });
    if (!student) throw new NotFoundError("Student not found");

    const amount = input.lines.reduce((sum, l) => sum + l.amount * l.qty, 0);
    const row = await prisma.$transaction(async (tx) => {
      const number = input.number ?? (await feeRepository.nextInvoiceNumber(tx));
      const invoice = await tx.invoice.create({
        data: {
          number,
          studentId: input.studentId,
          studentName: `${student.firstName} ${student.lastName}`,
          branchId: student.branchId,
          term: input.term,
          amount,
          lateFee: input.lateFee,
          dueOn: new Date(input.dueOn),
          status: input.publish ? "SENT" : "DRAFT",
          notes: input.notes,
          lines: {
            create: input.lines.map((l) => ({ label: l.label, amount: l.amount, qty: l.qty })),
          },
        },
        include: { lines: true },
      });
      return invoice;
    });
    return toInvoice(row);
  },

  async updateInvoice(scope: Scope, id: string, patch: Partial<{ status: Invoice["status"]; notes: string; lateFee: number; dueOn: string }>): Promise<Invoice> {
    requireRole(scope.role, ADMINS);
    const row = await feeRepository.updateInvoice(id, {
      ...patch,
      ...(patch.dueOn ? { dueOn: new Date(patch.dueOn) } : {}),
    });
    return toInvoice(row);
  },

  /**
   * Start a gateway payment. Deliberately does NOT change the invoice: the
   * money is not ours until the webhook says it is.
   */
  async createOrder(scope: Scope, invoiceId: string, amount?: number): Promise<PaymentOrder & { invoiceId: string }> {
    const invoice = await this.getInvoice(scope, invoiceId);
    const due = outstandingOf(invoice);
    const value = amount ?? due;
    if (value <= 0) throw new AppError("Nothing is outstanding on that invoice", 409, "nothing_due");
    if (value > due) throw new AppError("That is more than the invoice is owed", 422, "overpayment");
    const order = await paymentGateway.createOrder({
      amountRupees: value,
      receipt: invoice.number,
      notes: { invoiceId, studentId: invoice.studentId },
    });
    return { ...order, invoiceId };
  },

  /** Staff recording cash or a cheque taken at the desk. */
  async recordPayment(scope: Scope, input: RecordPaymentInput): Promise<{ invoice: Invoice; payment: Payment }> {
    requireRole(scope.role, ADMINS);
    if (!OFFLINE_METHODS.includes(input.method)) {
      throw new AppError(
        "Card and UPI payments must come through the gateway webhook, not be typed in",
        422,
        "gateway_only",
      );
    }
    return this.applyPayment(input.invoiceId, input.amount, input.method, input.reference ?? "", null);
  },

  /**
   * The one place an invoice's paid amount moves. Called by the webhook and by
   * staff recording cash — both go through the same cap and the same receipt
   * counter.
   */
  async applyPayment(
    invoiceId: string,
    amount: number,
    method: PaymentMethod,
    reference: string,
    gatewayOrderId: string | null,
  ): Promise<{ invoice: Invoice; payment: Payment }> {
    if (amount <= 0) throw new AppError("A payment has to be more than zero", 422, "zero_payment");

    return prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({ where: { id: invoiceId } });
      if (!invoice) throw new NotFoundError("Invoice not found");

      // Idempotency: gateways retry webhooks, and a retry must not be a second
      // payment.
      if (gatewayOrderId) {
        const seen = await tx.payment.findUnique({ where: { gatewayOrderId } });
        if (seen) {
          const current = await tx.invoice.findUniqueOrThrow({
            where: { id: invoiceId },
            include: { lines: true },
          });
          return { invoice: toInvoice(current), payment: toPayment(seen) };
        }
      }

      const total = invoice.amount + invoice.lateFee;
      const paidAmount = Math.min(total, invoice.paidAmount + amount);
      const applied = paidAmount - invoice.paidAmount;
      if (applied <= 0) throw new AppError("That invoice is already settled", 409, "already_paid");

      const payment = await tx.payment.create({
        data: {
          invoiceId,
          studentId: invoice.studentId,
          amount: applied,
          method,
          reference,
          receiptNo: await feeRepository.nextReceiptNo(tx),
          gatewayOrderId,
        },
      });

      const updated = await tx.invoice.update({
        where: { id: invoiceId },
        data: { paidAmount, status: paidAmount >= total ? "PAID" : "PARTIAL" },
        include: { lines: true },
      });

      return { invoice: toInvoice(updated), payment: toPayment(payment) };
    });
  },

  /** Called from the webhook route once the signature has verified. */
  async handleGatewayEvent(event: PaymentEvent): Promise<void> {
    if (event.status !== "captured") return;
    // The invoice id rode along in the order's notes. Anything without one is
    // not a payment this system started, and guessing would be worse than
    // ignoring it.
    const invoiceId = event.notes.invoiceId;
    if (!invoiceId) {
      logger.warn("Payment webhook carried no invoiceId in its notes", {
        orderId: event.orderId,
        paymentId: event.paymentId,
      });
      return;
    }
    const method = (["UPI", "CARD", "NETBANKING"].includes(event.method)
      ? event.method
      : "UPI") as PaymentMethod;
    await this.applyPayment(invoiceId, event.amount, method, event.paymentId, event.orderId);
  },
};
