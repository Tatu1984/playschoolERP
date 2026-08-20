import { NextRequest, NextResponse } from "next/server";
import { learningService } from "@/backend/services/learning.service";
import { updateLessonSchema } from "@/backend/validators/learning.validator";
import { authed } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

export const PATCH = authed(async (req: NextRequest, ctx: RouteContext<"/api/lessons/[id]">, session) => {
  const { id } = await ctx.params;
  const scope = await resolveScope(session);
  return { lesson: await learningService.updateLesson(scope, id, updateLessonSchema.parse(await req.json())) };
});

export const DELETE = authed(async (_req: NextRequest, ctx: RouteContext<"/api/lessons/[id]">, session) => {
  const { id } = await ctx.params;
  await learningService.deleteLesson(await resolveScope(session), id);
  return new NextResponse(null, { status: 204 });
});
