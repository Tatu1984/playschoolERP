import { NextRequest } from "next/server";
import { attendanceService } from "@/backend/services/attendance.service";
import { dayLogSchema } from "@/backend/validators/attendance.validator";
import { authed } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

// Mood, meals and nap — what the parent actually opens the app to read.
export const PATCH = authed(async (req: NextRequest, _ctx: unknown, session) => {
  const scope = await resolveScope(session);
  const { studentId, date, ...patch } = dayLogSchema.parse(await req.json());
  return { record: await attendanceService.updateDayLog(scope, studentId, date, patch) };
});
