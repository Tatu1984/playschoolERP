import { z } from "zod";
import { programSlug } from "./school.validator";

export const createInvoiceSchema = z.object({
  studentId: z.string().min(1),
  term: z.string().min(1),
  number: z.string().optional(),
  lines: z
    .array(
      z.object({
        label: z.string().min(1),
        amount: z.number().int().min(0),
        qty: z.number().int().min(1).default(1),
      }),
    )
    .min(1, "An invoice needs at least one line"),
  lateFee: z.number().int().min(0).default(0),
  dueOn: z.iso.datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  notes: z.string().default(""),
  /** Send it to the parent now, or keep it as a draft. */
  publish: z.boolean().default(true),
});

export const updateInvoiceSchema = z.object({
  status: z.enum(["DRAFT", "SENT", "PARTIAL", "PAID", "OVERDUE", "CANCELLED"]).optional(),
  notes: z.string().optional(),
  lateFee: z.number().int().min(0).optional(),
  dueOn: z.iso.datetime().optional(),
});

export const createOrderSchema = z.object({
  invoiceId: z.string().min(1),
  /** Part-payment; defaults to the whole outstanding balance. */
  amount: z.number().int().positive().optional(),
});

export const recordPaymentSchema = z.object({
  invoiceId: z.string().min(1),
  amount: z.number().int().positive(),
  method: z.enum(["CASH", "CHEQUE"]),
  reference: z.string().optional(),
});

export const feeStructureSchema = z.object({
  branchId: z.string().min(1),
  programSlug,
  admissionFee: z.number().int().min(0).default(0),
  termFee: z.number().int().min(0).default(0),
  transportFee: z.number().int().min(0).default(0),
  mealFee: z.number().int().min(0).default(0),
  activityFee: z.number().int().min(0).default(0),
  termsPerYear: z.number().int().min(1).max(12).default(3),
  lateFeePerDay: z.number().int().min(0).default(0),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
