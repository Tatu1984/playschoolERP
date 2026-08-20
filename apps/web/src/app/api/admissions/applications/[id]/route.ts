import { NextRequest } from "next/server";
import { admissionService } from "@/backend/services/admission.service";
import { applicationStatusSchema } from "@/backend/validators/admission.validator";
import { auditService } from "@/backend/services/audit.service";
import { authed } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

export const PATCH = authed(async (req: NextRequest, ctx: RouteContext<"/api/admissions/applications/[id]">, session) => {
  const { id } = await ctx.params;
  const scope = await resolveScope(session);
  const { status, note } = applicationStatusSchema.parse(await req.json());
  const application = await admissionService.setApplicationStatus(scope, id, status, note);
  await auditService.record(session, {
    action: "application.status",
    target: application.applicationNo,
    detail: status,
  });
  return { application };
});
