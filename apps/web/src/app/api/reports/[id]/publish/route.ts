import { NextRequest } from "next/server";
import { learningService } from "@/backend/services/learning.service";
import { publishReportSchema } from "@/backend/validators/learning.validator";
import { authed } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

export const POST = authed(async (req: NextRequest, ctx: RouteContext<"/api/reports/[id]/publish">, session) => {
  const { id } = await ctx.params;
  const scope = await resolveScope(session);
  const { publish } = publishReportSchema.parse(await req.json());
  return { report: await learningService.publishReport(scope, id, publish) };
});
