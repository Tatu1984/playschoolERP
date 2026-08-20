import { NextRequest, NextResponse } from "next/server";
import { admissionService } from "@/backend/services/admission.service";
import { updateEventSchema } from "@/backend/validators/admission.validator";
import { authed, open } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

// `id` is the slug here — that is what the public event page links to.
export const GET = open(async (_req: NextRequest, ctx: RouteContext<"/api/events/[id]">) => {
  const { id } = await ctx.params;
  return { event: await admissionService.getEvent(id) };
});

export const PATCH = authed(async (req: NextRequest, ctx: RouteContext<"/api/events/[id]">, session) => {
  const { id } = await ctx.params;
  const scope = await resolveScope(session);
  return { event: await admissionService.updateEvent(scope, id, updateEventSchema.parse(await req.json())) };
});

export const DELETE = authed(async (_req: NextRequest, ctx: RouteContext<"/api/events/[id]">, session) => {
  const { id } = await ctx.params;
  await admissionService.deleteEvent(await resolveScope(session), id);
  return new NextResponse(null, { status: 204 });
});
