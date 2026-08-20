import { NextRequest } from "next/server";
import { feeService } from "@/backend/services/fee.service";
import { createOrderSchema } from "@/backend/validators/fee.validator";
import { authed, created } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

// Creates a gateway order. It does not mark anything paid — the webhook does.
export const POST = authed(async (req: NextRequest, _ctx: unknown, session) => {
  const scope = await resolveScope(session);
  const { invoiceId, amount } = createOrderSchema.parse(await req.json());
  return created({ order: await feeService.createOrder(scope, invoiceId, amount) });
});
