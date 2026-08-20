import { NextRequest } from "next/server";
import { opsService } from "@/backend/services/ops.service";
import { medicalProfileSchema } from "@/backend/validators/ops.validator";
import { auditService } from "@/backend/services/audit.service";
import { authed } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

export const GET = authed(async (_req: NextRequest, ctx: RouteContext<"/api/medical/[studentId]">, session) => {
  const { studentId } = await ctx.params;
  return { medicalProfile: await opsService.medicalProfile(await resolveScope(session), studentId) };
});

/**
 * Audited on purpose: "who removed the peanut allergy" is a question that could
 * matter enormously one afternoon.
 */
export const PATCH = authed(async (req: NextRequest, ctx: RouteContext<"/api/medical/[studentId]">, session) => {
  const { studentId } = await ctx.params;
  const scope = await resolveScope(session);
  const input = medicalProfileSchema.parse({ ...(await req.json()), studentId });
  const medicalProfile = await opsService.upsertMedicalProfile(scope, input);
  await auditService.record(session, {
    action: "medical.update",
    target: studentId,
    detail: `allergies: ${medicalProfile.allergies.join(", ") || "none"}`,
  });
  return { medicalProfile };
});
