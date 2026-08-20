import { NextRequest } from "next/server";
import { analyticsService } from "@/backend/services/analytics.service";
import { authed } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

export const GET = authed(async (_req: NextRequest, _ctx: unknown, session) => {
  const scope = await resolveScope(session);
  const [analytics, overview] = await Promise.all([
    analyticsService.snapshot(scope),
    analyticsService.overview(scope),
  ]);
  return { analytics, overview };
});
