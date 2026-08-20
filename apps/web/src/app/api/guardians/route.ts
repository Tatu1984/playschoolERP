import { NextRequest } from "next/server";
import { schoolService } from "@/backend/services/school.service";
import { auditService } from "@/backend/services/audit.service";
import { createGuardianSchema } from "@/backend/validators/school.validator";
import { authed, created } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

export const GET = authed(async (_req: NextRequest, _ctx: unknown, session) => {
  const scope = await resolveScope(session);
  return { guardians: await schoolService.listGuardians(scope) };
});

export const POST = authed(async (req: NextRequest, _ctx: unknown, session) => {
  const scope = await resolveScope(session);
  const guardian = await schoolService.createGuardian(scope, createGuardianSchema.parse(await req.json()));
  await auditService.record(session, { action: "guardian.create", target: guardian.name });
  return created({ guardian });
});
