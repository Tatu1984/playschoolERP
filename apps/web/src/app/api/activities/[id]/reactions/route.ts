import { NextRequest } from "next/server";
import { feedService } from "@/backend/services/feed.service";
import { authed } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

// Idempotent from the client's point of view: POST toggles the heart.
export const POST = authed(async (_req: NextRequest, ctx: RouteContext<"/api/activities/[id]/reactions">, session) => {
  const { id } = await ctx.params;
  return { activity: await feedService.react(await resolveScope(session), id) };
});
