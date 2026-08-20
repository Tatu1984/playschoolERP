import { NextRequest } from "next/server";
import { opsService } from "@/backend/services/ops.service";
import { emergencyContactSchema } from "@/backend/validators/ops.validator";
import { authed, created, q } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";
import { AppError } from "@/backend/utils/error-handler.util";

export const runtime = "nodejs";

export const GET = authed(async (req: NextRequest, _ctx: unknown, session) => {
  const studentId = q(req, "studentId");
  if (!studentId) throw new AppError("studentId is required", 422, "missing_query");
  return { contacts: await opsService.emergencyContacts(await resolveScope(session), studentId) };
});

export const POST = authed(async (req: NextRequest, _ctx: unknown, session) => {
  const scope = await resolveScope(session);
  return created({ contact: await opsService.upsertEmergencyContact(scope, null, emergencyContactSchema.parse(await req.json())) });
});
