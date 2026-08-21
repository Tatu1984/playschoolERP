import { NextRequest } from "next/server";
import { admissionService } from "@/backend/services/admission.service";
import { createApplicationSchema } from "@/backend/validators/admission.validator";
import { authed, created, open } from "@/backend/utils/route.util";
import { clientIp, enforceRateLimit, PUBLIC_FORM_LIMIT } from "@/backend/utils/rate-limit.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

export const GET = authed(async (_req: NextRequest, _ctx: unknown, session) => {
  return { applications: await admissionService.listApplications(await resolveScope(session)) };
});

// Public: the four-step form on /admissions/apply.
export const POST = open(async (req: NextRequest) => {
  await enforceRateLimit(PUBLIC_FORM_LIMIT, `ip:${clientIp(req)}`);
  return created({ application: await admissionService.createApplication(createApplicationSchema.parse(await req.json())) });
});
