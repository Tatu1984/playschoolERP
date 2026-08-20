import { NextRequest } from "next/server";
import { attendanceService } from "@/backend/services/attendance.service";
import { bulkMarkSchema } from "@/backend/validators/attendance.validator";
import { authed } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

// Mark a whole class in one go — the "everyone's here" button.
export const POST = authed(async (req: NextRequest, _ctx: unknown, session) => {
  const scope = await resolveScope(session);
  const records = await attendanceService.markBulk(scope, bulkMarkSchema.parse(await req.json()));
  return { records };
});
