import { NextRequest } from "next/server";
import { opsService } from "@/backend/services/ops.service";
import { preferenceSchema } from "@/backend/validators/ops.validator";
import { authed } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

export const GET = authed(async (_req: NextRequest, _ctx: unknown, session) => {
  return { preferences: await opsService.preferences(await resolveScope(session)) };
});

export const POST = authed(async (req: NextRequest, _ctx: unknown, session) => {
  const scope = await resolveScope(session);
  return { preferences: await opsService.setPreferences(scope, preferenceSchema.parse(await req.json())) };
});
