import { NextRequest } from "next/server";
import { admissionService } from "@/backend/services/admission.service";
import { inquiryNoteSchema } from "@/backend/validators/admission.validator";
import { authed, created } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

export const POST = authed(async (req: NextRequest, ctx: RouteContext<"/api/admissions/inquiry/[id]/notes">, session) => {
  const { id } = await ctx.params;
  const scope = await resolveScope(session);
  const { body } = inquiryNoteSchema.parse(await req.json());
  return created({ inquiry: await admissionService.addInquiryNote(scope, id, body) });
});
