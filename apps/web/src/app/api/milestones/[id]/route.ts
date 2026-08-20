import { NextRequest, NextResponse } from "next/server";
import { learningService } from "@/backend/services/learning.service";
import { authed } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

export const DELETE = authed(async (_req: NextRequest, ctx: RouteContext<"/api/milestones/[id]">, session) => {
  const { id } = await ctx.params;
  await learningService.deleteMilestone(await resolveScope(session), id);
  return new NextResponse(null, { status: 204 });
});
