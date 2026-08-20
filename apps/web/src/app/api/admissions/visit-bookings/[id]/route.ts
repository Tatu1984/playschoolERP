import { NextRequest } from "next/server";
import { admissionService } from "@/backend/services/admission.service";
import { visitStatusSchema } from "@/backend/validators/admission.validator";
import { authed } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

export const PATCH = authed(async (req: NextRequest, ctx: RouteContext<"/api/admissions/visit-bookings/[id]">, session) => {
  const { id } = await ctx.params;
  const scope = await resolveScope(session);
  const { status } = visitStatusSchema.parse(await req.json());
  return { booking: await admissionService.setVisitStatus(scope, id, status) };
});
