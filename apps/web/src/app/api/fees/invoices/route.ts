import { NextRequest } from "next/server";
import { feeService } from "@/backend/services/fee.service";
import { auditService } from "@/backend/services/audit.service";
import { createInvoiceSchema } from "@/backend/validators/fee.validator";
import { authed, created, q } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

export const GET = authed(async (req: NextRequest, _ctx: unknown, session) => {
  const scope = await resolveScope(session);
  return {
    invoices: await feeService.listInvoices(scope, {
      studentId: q(req, "studentId"),
      status: q(req, "status"),
    }),
  };
});

export const POST = authed(async (req: NextRequest, _ctx: unknown, session) => {
  const scope = await resolveScope(session);
  const invoice = await feeService.createInvoice(scope, createInvoiceSchema.parse(await req.json()));
  await auditService.record(session, {
    action: "invoice.create",
    target: invoice.number,
    detail: `₹${invoice.amount} for ${invoice.studentName}`,
  });
  return created({ invoice });
});
