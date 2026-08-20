import { NextRequest } from "next/server";
import { feedService } from "@/backend/services/feed.service";
import { createActivitySchema } from "@/backend/validators/feed.validator";
import { authed, created, q } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

export const GET = authed(async (req: NextRequest, _ctx: unknown, session) => {
  const scope = await resolveScope(session);
  return { activities: await feedService.list(scope, { classroomId: q(req, "classroomId") }) };
});

export const POST = authed(async (req: NextRequest, _ctx: unknown, session) => {
  const scope = await resolveScope(session);
  return created({ activity: await feedService.create(scope, createActivitySchema.parse(await req.json())) });
});
