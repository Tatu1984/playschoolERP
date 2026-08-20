import { NextRequest, NextResponse } from "next/server";
import { opsService } from "@/backend/services/ops.service";
import { emergencyContactSchema } from "@/backend/validators/ops.validator";
import { authed } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

export const PATCH = authed(async (req: NextRequest, ctx: RouteContext<"/api/emergency/contacts/[id]">, session) => {
  const { id } = await ctx.params;
  const scope = await resolveScope(session);
  return { contact: await opsService.upsertEmergencyContact(scope, id, emergencyContactSchema.parse(await req.json())) };
});

export const DELETE = authed(async (_req: NextRequest, ctx: RouteContext<"/api/emergency/contacts/[id]">, session) => {
  const { id } = await ctx.params;
  await opsService.deleteEmergencyContact(await resolveScope(session), id);
  return new NextResponse(null, { status: 204 });
});
