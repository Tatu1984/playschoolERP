import { NextRequest } from "next/server";
import { kidsService } from "@/backend/services/kids.service";
import { finishStorySchema } from "@/backend/validators/kids.validator";
import { authed, open } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

export const GET = open(async (_req: NextRequest, ctx: RouteContext<"/api/stories/[id]">) => {
  const { id } = await ctx.params;
  return { story: await kidsService.getStory(id) };
});

// Reaching the last page — this is what unlocks the Bookworm badge.
export const POST = authed(async (req: NextRequest, ctx: RouteContext<"/api/stories/[id]">, session) => {
  const { id } = await ctx.params;
  const scope = await resolveScope(session);
  const { studentId } = finishStorySchema.parse({ ...(await req.json()), storyId: id });
  return { journey: await kidsService.finishStory(scope, studentId, id) };
});
