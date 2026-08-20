import { NextRequest } from "next/server";
import { feeService } from "@/backend/services/fee.service";
import { authed, q } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

export const GET = authed(async (req: NextRequest, _ctx: unknown, session) => {
  const scope = await resolveScope(session);
  return { summary: await feeService.summary(scope, q(req, "studentId")) };
});
