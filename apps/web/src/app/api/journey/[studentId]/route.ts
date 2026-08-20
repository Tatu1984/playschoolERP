import { NextRequest } from "next/server";
import { kidsService } from "@/backend/services/kids.service";
import { mascotSchema } from "@/backend/validators/kids.validator";
import { authed } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

export const GET = authed(async (_req: NextRequest, ctx: RouteContext<"/api/journey/[studentId]">, session) => {
  const { studentId } = await ctx.params;
  return { journey: await kidsService.journey(await resolveScope(session), studentId) };
});

export const PATCH = authed(async (req: NextRequest, ctx: RouteContext<"/api/journey/[studentId]">, session) => {
  const { studentId } = await ctx.params;
  const scope = await resolveScope(session);
  const { mascot } = mascotSchema.parse({ ...(await req.json()), studentId });
  return { journey: await kidsService.setMascot(scope, studentId, mascot) };
});
