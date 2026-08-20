import { NextRequest } from "next/server";
import { learningService } from "@/backend/services/learning.service";
import { authed } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

// One call for the whole progress screen: reports plus the milestone log.
export const GET = authed(async (_req: NextRequest, ctx: RouteContext<"/api/progress/[studentId]">, session) => {
  const { studentId } = await ctx.params;
  const scope = await resolveScope(session);
  const [progressReports, milestones] = await Promise.all([
    learningService.listReports(scope, studentId),
    learningService.listMilestones(scope, studentId),
  ]);
  return { progressReports, milestones };
});
