import { NextRequest } from "next/server";
import { cmsService } from "@/backend/services/cms.service";
import { mediaAssetSchema } from "@/backend/validators/cms.validator";
import { authed, created } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

export const GET = authed(async (_req: NextRequest, _ctx: unknown, session) => {
  return { mediaAssets: await cmsService.listMedia(await resolveScope(session)) };
});

export const POST = authed(async (req: NextRequest, _ctx: unknown, session) => {
  const scope = await resolveScope(session);
  return created({ asset: await cmsService.addMedia(scope, mediaAssetSchema.parse(await req.json())) });
});
