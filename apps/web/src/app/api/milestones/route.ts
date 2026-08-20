import { NextRequest } from "next/server";
import { learningService } from "@/backend/services/learning.service";
import { createMilestoneSchema } from "@/backend/validators/learning.validator";
import { authed, created, q } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

export const GET = authed(async (req: NextRequest, _ctx: unknown, session) => {
  const scope = await resolveScope(session);
  return { milestones: await learningService.listMilestones(scope, q(req, "studentId")) };
});

export const POST = authed(async (req: NextRequest, _ctx: unknown, session) => {
  const scope = await resolveScope(session);
  return created({ milestone: await learningService.addMilestone(scope, createMilestoneSchema.parse(await req.json())) });
});
