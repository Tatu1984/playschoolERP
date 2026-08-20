import { NextRequest } from "next/server";
import { feedService } from "@/backend/services/feed.service";
import { commentSchema } from "@/backend/validators/feed.validator";
import { authed, created } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

export const POST = authed(async (req: NextRequest, ctx: RouteContext<"/api/activities/[id]/comments">, session) => {
  const { id } = await ctx.params;
  const scope = await resolveScope(session);
  const { body } = commentSchema.parse(await req.json());
  return created({ activity: await feedService.comment(scope, id, body) });
});
