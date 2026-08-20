import { NextRequest, NextResponse } from "next/server";
import { opsService } from "@/backend/services/ops.service";
import { authed } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

export const DELETE = authed(async (_req: NextRequest, ctx: RouteContext<"/api/notifications/devices/[id]">, session) => {
  const { id } = await ctx.params;
  await opsService.removeDevice(await resolveScope(session), id);
  return new NextResponse(null, { status: 204 });
});
