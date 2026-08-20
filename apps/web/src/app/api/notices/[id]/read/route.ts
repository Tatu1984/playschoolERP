import { NextRequest } from "next/server";
import { feedService } from "@/backend/services/feed.service";
import { authed } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

export const POST = authed(async (_req: NextRequest, ctx: RouteContext<"/api/notices/[id]/read">, session) => {
  const { id } = await ctx.params;
  return { notice: await feedService.markNoticeRead(await resolveScope(session), id) };
});
