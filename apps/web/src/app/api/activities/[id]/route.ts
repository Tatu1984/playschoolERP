import { NextRequest, NextResponse } from "next/server";
import { feedService } from "@/backend/services/feed.service";
import { updateActivitySchema } from "@/backend/validators/feed.validator";
import { authed } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

export const GET = authed(async (_req: NextRequest, ctx: RouteContext<"/api/activities/[id]">, session) => {
  const { id } = await ctx.params;
  return { activity: await feedService.get(await resolveScope(session), id) };
});

export const PATCH = authed(async (req: NextRequest, ctx: RouteContext<"/api/activities/[id]">, session) => {
  const { id } = await ctx.params;
  const scope = await resolveScope(session);
  return { activity: await feedService.update(scope, id, updateActivitySchema.parse(await req.json())) };
});

export const DELETE = authed(async (_req: NextRequest, ctx: RouteContext<"/api/activities/[id]">, session) => {
  const { id } = await ctx.params;
  await feedService.remove(await resolveScope(session), id);
  return new NextResponse(null, { status: 204 });
});
