import { NextRequest } from "next/server";
import { attendanceService } from "@/backend/services/attendance.service";
import { checkInSchema } from "@/backend/validators/attendance.validator";
import { authed } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

export const POST = authed(async (req: NextRequest, _ctx: unknown, session) => {
  const scope = await resolveScope(session);
  const { studentId, classroomId } = checkInSchema.parse(await req.json());
  return { record: await attendanceService.checkIn(scope, studentId, classroomId) };
});
