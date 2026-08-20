import { NextRequest } from "next/server";
import { cmsService } from "@/backend/services/cms.service";
import { bannerSchema } from "@/backend/validators/cms.validator";
import { authed, created, open } from "@/backend/utils/route.util";
import { getSession } from "@/backend/services/auth.service";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

export const GET = open(async () => {
  const session = await getSession();
  const scope = session ? await resolveScope(session) : null;
  return { banners: await cmsService.listBanners(scope) };
});

export const POST = authed(async (req: NextRequest, _ctx: unknown, session) => {
  const scope = await resolveScope(session);
  return created({ banner: await cmsService.upsertBanner(scope, null, bannerSchema.parse(await req.json())) });
});
