import { NextRequest } from "next/server";
import { admissionService } from "@/backend/services/admission.service";
import { createInquirySchema } from "@/backend/validators/admission.validator";
import { authed, created, open } from "@/backend/utils/route.util";
import { clientIp, enforceRateLimit, PUBLIC_FORM_LIMIT } from "@/backend/utils/rate-limit.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

export const GET = authed(async (_req: NextRequest, _ctx: unknown, session) => {
  return { inquiries: await admissionService.listInquiries(await resolveScope(session)) };
});

/**
 * Public. Anyone on the website can post here, so nothing about the pipeline
 * (stage, assignee, source) is taken from the body.
 */
export const POST = open(async (req: NextRequest) => {
  await enforceRateLimit(PUBLIC_FORM_LIMIT, `ip:${clientIp(req)}`);
  const inquiry = await admissionService.createInquiry(createInquirySchema.parse(await req.json()));
  return created({ inquiry });
});
