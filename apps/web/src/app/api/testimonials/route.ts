import { NextRequest } from "next/server";
import { cmsService } from "@/backend/services/cms.service";
import { testimonialSchema } from "@/backend/validators/cms.validator";
import { authed, created, open } from "@/backend/utils/route.util";
import { getSession } from "@/backend/services/auth.service";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

// Public: only published ones. Signed-in staff also see what is waiting.
export const GET = open(async () => {
  const session = await getSession();
  const scope = session ? await resolveScope(session) : null;
  return { testimonials: await cmsService.listTestimonials(scope) };
});

export const POST = authed(async (req: NextRequest, _ctx: unknown, session) => {
  const scope = await resolveScope(session);
  return created({ testimonial: await cmsService.upsertTestimonial(scope, null, testimonialSchema.parse(await req.json())) });
});
