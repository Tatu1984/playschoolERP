import { NextRequest } from "next/server";
import { learningService } from "@/backend/services/learning.service";
import { upsertReportSchema } from "@/backend/validators/learning.validator";
import { authed, created, q } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

// Parents get published reports for their own children; staff get drafts too.
export const GET = authed(async (req: NextRequest, _ctx: unknown, session) => {
  const scope = await resolveScope(session);
  return { progressReports: await learningService.listReports(scope, q(req, "studentId")) };
});

export const POST = authed(async (req: NextRequest, _ctx: unknown, session) => {
  const scope = await resolveScope(session);
  return created({ report: await learningService.upsertReport(scope, upsertReportSchema.parse(await req.json())) });
});
