import { NextRequest } from "next/server";
import { feeService } from "@/backend/services/fee.service";
import { authed } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

export const GET = authed(async (_req: NextRequest, _ctx: unknown, session) => {
  return { feeStructures: await feeService.listStructures(await resolveScope(session)) };
});
