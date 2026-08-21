import { NextRequest } from "next/server";
import { admissionService } from "@/backend/services/admission.service";
import { createVisitSchema } from "@/backend/validators/admission.validator";
import { authed, created, open } from "@/backend/utils/route.util";
import { clientIp, enforceRateLimit, PUBLIC_FORM_LIMIT } from "@/backend/utils/rate-limit.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

export const GET = authed(async (_req: NextRequest, _ctx: unknown, session) => {
  return { visitBookings: await admissionService.listVisits(await resolveScope(session)) };
});

// Public. Two families cannot take the same slot: the unique index decides.
export const POST = open(async (req: NextRequest) => {
  await enforceRateLimit(PUBLIC_FORM_LIMIT, `ip:${clientIp(req)}`);
  return created({ booking: await admissionService.bookVisit(createVisitSchema.parse(await req.json())) });
});
