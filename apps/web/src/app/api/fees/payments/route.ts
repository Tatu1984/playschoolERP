import { NextRequest } from "next/server";
import { feeService } from "@/backend/services/fee.service";
import { auditService } from "@/backend/services/audit.service";
import { recordPaymentSchema } from "@/backend/validators/fee.validator";
import { authed, created, q } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

export const GET = authed(async (req: NextRequest, _ctx: unknown, session) => {
  const scope = await resolveScope(session);
  return { payments: await feeService.listPayments(scope, q(req, "studentId")) };
});

// Cash and cheque only — anything with a gateway behind it arrives by webhook.
export const POST = authed(async (req: NextRequest, _ctx: unknown, session) => {
  const scope = await resolveScope(session);
  const result = await feeService.recordPayment(scope, recordPaymentSchema.parse(await req.json()));
  await auditService.record(session, {
    action: "payment.record",
    target: result.payment.receiptNo,
    detail: `₹${result.payment.amount} ${result.payment.method}`,
  });
  return created(result);
});
