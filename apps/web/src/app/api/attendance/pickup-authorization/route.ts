import { NextRequest } from "next/server";
import { attendanceService } from "@/backend/services/attendance.service";
import { pickupAuthSchema } from "@/backend/validators/attendance.validator";
import { authed, created, q } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

export const GET = authed(async (req: NextRequest, _ctx: unknown, session) => {
  const scope = await resolveScope(session);
  return { authorizations: await attendanceService.listPickupAuths(scope, q(req, "studentId")) };
});

export const POST = authed(async (req: NextRequest, _ctx: unknown, session) => {
  const scope = await resolveScope(session);
  const authorization = await attendanceService.authorizePickup(scope, pickupAuthSchema.parse(await req.json()));
  return created({ authorization });
});
