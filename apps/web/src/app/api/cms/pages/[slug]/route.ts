import { NextRequest } from "next/server";
import { cmsService } from "@/backend/services/cms.service";
import { cmsPageSchema } from "@/backend/validators/cms.validator";
import { authed, open } from "@/backend/utils/route.util";
import { getSession } from "@/backend/services/auth.service";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

export const GET = open(async (_req: NextRequest, ctx: RouteContext<"/api/cms/pages/[slug]">) => {
  const { slug } = await ctx.params;
  const session = await getSession();
  const scope = session ? await resolveScope(session) : null;
  return { page: await cmsService.getPage(scope, slug) };
});

export const PATCH = authed(async (req: NextRequest, ctx: RouteContext<"/api/cms/pages/[slug]">, session) => {
  const { slug } = await ctx.params;
  const scope = await resolveScope(session);
  return { page: await cmsService.upsertPage(scope, slug, cmsPageSchema.parse(await req.json())) };
});
