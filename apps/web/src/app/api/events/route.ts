import { NextRequest } from "next/server";
import { admissionService } from "@/backend/services/admission.service";
import { createEventSchema } from "@/backend/validators/admission.validator";
import { authed, created, open } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";
import { getSession } from "@/backend/services/auth.service";

export const runtime = "nodejs";

// Public when signed out (the marketing events page), scoped when signed in.
export const GET = open(async () => {
  const session = await getSession();
  const scope = session ? await resolveScope(session) : null;
  return { events: await admissionService.listEvents(scope) };
});

export const POST = authed(async (req: NextRequest, _ctx: unknown, session) => {
  const scope = await resolveScope(session);
  return created({ event: await admissionService.createEvent(scope, createEventSchema.parse(await req.json())) });
});
