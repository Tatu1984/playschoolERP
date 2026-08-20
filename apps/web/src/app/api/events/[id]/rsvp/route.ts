import { NextRequest } from "next/server";
import { admissionService } from "@/backend/services/admission.service";
import { rsvpSchema } from "@/backend/validators/admission.validator";
import { authed } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

export const POST = authed(async (req: NextRequest, ctx: RouteContext<"/api/events/[id]/rsvp">, session) => {
  const { id } = await ctx.params;
  const scope = await resolveScope(session);
  const { guests } = rsvpSchema.parse(await req.json().catch(() => ({})));
  return { event: await admissionService.rsvp(scope, id, guests) };
});

export const DELETE = authed(async (_req: NextRequest, ctx: RouteContext<"/api/events/[id]/rsvp">, session) => {
  const { id } = await ctx.params;
  return { event: await admissionService.cancelRsvp(await resolveScope(session), id) };
});
