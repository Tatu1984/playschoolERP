import { prisma, type Prisma } from "@/backend/database/client";

export const invoiceInclude = { lines: true } satisfies Prisma.InvoiceInclude;

export const feeRepository = {
  listInvoices(where: Prisma.InvoiceWhereInput, take?: number) {
    return prisma.invoice.findMany({
      where,
      include: invoiceInclude,
      orderBy: { issuedOn: "desc" },
      ...(take ? { take } : {}),
    });
  },

  findInvoice(id: string) {
    return prisma.invoice.findUnique({ where: { id }, include: invoiceInclude });
  },

  updateInvoice(id: string, data: Prisma.InvoiceUncheckedUpdateInput) {
    return prisma.invoice.update({ where: { id }, data, include: invoiceInclude });
  },

  listPayments(where: Prisma.PaymentWhereInput, take?: number) {
    return prisma.payment.findMany({ where, orderBy: { paidAt: "desc" }, ...(take ? { take } : {}) });
  },

  listStructures(where: Prisma.FeeStructureWhereInput) {
    return prisma.feeStructure.findMany({ where, orderBy: { programSlug: "asc" } });
  },

  upsertStructure(branchId: string, programSlug: string, data: Prisma.FeeStructureUncheckedCreateInput) {
    return prisma.feeStructure.upsert({
      where: { branchId_programSlug: { branchId, programSlug } },
      update: data,
      create: data,
    });
  },

  /**
   * Sequential document numbers. Both of these run inside the caller's
   * transaction so two concurrent writers cannot be handed the same number.
   */
  async nextInvoiceNumber(tx: Prisma.TransactionClient): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `INV/${year}/`;
    // INV/<year>/<seq> — take the third segment so the offset never has to be
    // a bind parameter, which Postgres cannot type-infer inside SUBSTRING.
    const rows = await tx.$queryRaw<{ max: number | null }[]>`
      SELECT MAX(CAST(split_part("number", '/', 3) AS INTEGER)) AS max
      FROM "Invoice"
      WHERE "number" LIKE ${`${prefix}%`}
        AND split_part("number", '/', 3) ~ '^[0-9]+$'
    `;
    return `${prefix}${String((rows[0]?.max ?? 0) + 1).padStart(4, "0")}`;
  },

  /**
   * Receipt numbers are unpadded, so the highest one has to be found
   * numerically. Ordering by the string would call RCPT/9999 higher than
   * RCPT/10000 and hand out a duplicate the moment the school crosses ten
   * thousand receipts.
   */
  async nextReceiptNo(tx: Prisma.TransactionClient): Promise<string> {
    const rows = await tx.$queryRaw<{ max: number | null }[]>`
      SELECT MAX(CAST(split_part("receiptNo", '/', 2) AS INTEGER)) AS max
      FROM "Payment"
      WHERE "receiptNo" ~ '^RCPT/[0-9]+$'
    `;
    return `RCPT/${(rows[0]?.max ?? 3000) + 1}`;
  },
};
