import { NextRequest } from "next/server";
import { opsService } from "@/backend/services/ops.service";
import { authed } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

export const POST = authed(async (_req: NextRequest, ctx: RouteContext<"/api/emergency/broadcasts/[id]/ack">, session) => {
  const { id } = await ctx.params;
  return { broadcast: await opsService.acknowledgeBroadcast(await resolveScope(session), id) };
});
