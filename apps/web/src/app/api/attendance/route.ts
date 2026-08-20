import { NextRequest } from "next/server";
import { attendanceService } from "@/backend/services/attendance.service";
import { markAttendanceSchema } from "@/backend/validators/attendance.validator";
import { authed, q } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

export const GET = authed(async (req: NextRequest, _ctx: unknown, session) => {
  const scope = await resolveScope(session);
  const attendance = await attendanceService.list(scope, {
    studentId: q(req, "studentId"),
    classroomId: q(req, "classroomId"),
    date: q(req, "date"),
    from: q(req, "from"),
    to: q(req, "to"),
  });
  return { attendance };
});

export const POST = authed(async (req: NextRequest, _ctx: unknown, session) => {
  const scope = await resolveScope(session);
  const record = await attendanceService.mark(scope, markAttendanceSchema.parse(await req.json()));
  return { record };
});
