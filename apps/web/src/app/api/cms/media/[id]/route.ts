import { NextRequest, NextResponse } from "next/server";
import { cmsService } from "@/backend/services/cms.service";
import { mediaAssetSchema } from "@/backend/validators/cms.validator";
import { authed } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

export const DELETE = authed(async (_req: NextRequest, ctx: RouteContext<"/api/cms/media/[id]">, session) => {
  const { id } = await ctx.params;
  await cmsService.deleteMedia(await resolveScope(session), id);
  return new NextResponse(null, { status: 204 });
});

export const PATCH = authed(async (req: NextRequest, ctx: RouteContext<"/api/cms/media/[id]">, session) => {
  const { id } = await ctx.params;
  const scope = await resolveScope(session);
  return { asset: await cmsService.updateMedia(scope, id, mediaAssetSchema.partial().parse(await req.json())) };
});
