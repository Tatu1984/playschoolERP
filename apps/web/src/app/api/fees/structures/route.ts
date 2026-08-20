import { NextRequest } from "next/server";
import { feeService } from "@/backend/services/fee.service";
import { feeStructureSchema } from "@/backend/validators/fee.validator";
import { authed } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

export const GET = authed(async (_req: NextRequest, _ctx: unknown, session) => {
  return { feeStructures: await feeService.listStructures(await resolveScope(session)) };
});

/**
 * A fee structure is identified by (branch, programme), not by a surrogate id,
 * so editing one is an upsert on that pair.
 */
export const PATCH = authed(async (req: NextRequest, _ctx: unknown, session) => {
  const scope = await resolveScope(session);
  return { feeStructure: await feeService.upsertStructure(scope, feeStructureSchema.parse(await req.json())) };
});
