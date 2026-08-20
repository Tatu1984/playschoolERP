import { NextRequest } from "next/server";
import { admissionService } from "@/backend/services/admission.service";
import { inquiryStageSchema } from "@/backend/validators/admission.validator";
import { authed } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

export const PATCH = authed(async (req: NextRequest, ctx: RouteContext<"/api/admissions/inquiry/[id]">, session) => {
  const { id } = await ctx.params;
  const scope = await resolveScope(session);
  const { stage } = inquiryStageSchema.parse(await req.json());
  return { inquiry: await admissionService.moveInquiry(scope, id, stage) };
});
