import { NextRequest } from "next/server";
import { attendanceService } from "@/backend/services/attendance.service";
import { checkOutSchema } from "@/backend/validators/attendance.validator";
import { authed } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

export const POST = authed(async (req: NextRequest, _ctx: unknown, session) => {
  const scope = await resolveScope(session);
  const { studentId, pickedUpBy, code } = checkOutSchema.parse(await req.json());
  return { record: await attendanceService.checkOut(scope, studentId, pickedUpBy, code) };
});
