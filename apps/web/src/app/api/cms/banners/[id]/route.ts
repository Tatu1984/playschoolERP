import { NextRequest, NextResponse } from "next/server";
import { cmsService } from "@/backend/services/cms.service";
import { bannerSchema } from "@/backend/validators/cms.validator";
import { authed } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

export const PATCH = authed(async (req: NextRequest, ctx: RouteContext<"/api/cms/banners/[id]">, session) => {
  const { id } = await ctx.params;
  const scope = await resolveScope(session);
  return { banner: await cmsService.upsertBanner(scope, id, bannerSchema.parse(await req.json())) };
});

export const DELETE = authed(async (_req: NextRequest, ctx: RouteContext<"/api/cms/banners/[id]">, session) => {
  const { id } = await ctx.params;
  await cmsService.deleteBanner(await resolveScope(session), id);
  return new NextResponse(null, { status: 204 });
});
