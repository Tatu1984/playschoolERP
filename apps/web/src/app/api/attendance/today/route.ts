import { NextRequest } from "next/server";
import { attendanceService } from "@/backend/services/attendance.service";
import { authed } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

export const GET = authed(async (_req: NextRequest, _ctx: unknown, session) => {
  const scope = await resolveScope(session);
  return { attendance: await attendanceService.today(scope) };
});
