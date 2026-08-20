import { NextRequest } from "next/server";
import { feeService } from "@/backend/services/fee.service";
import { updateInvoiceSchema } from "@/backend/validators/fee.validator";
import { authed } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

export const GET = authed(async (_req: NextRequest, ctx: RouteContext<"/api/fees/invoices/[id]">, session) => {
  const { id } = await ctx.params;
  return { invoice: await feeService.getInvoice(await resolveScope(session), id) };
});

export const PATCH = authed(async (req: NextRequest, ctx: RouteContext<"/api/fees/invoices/[id]">, session) => {
  const { id } = await ctx.params;
  const scope = await resolveScope(session);
  return { invoice: await feeService.updateInvoice(scope, id, updateInvoiceSchema.parse(await req.json())) };
});
