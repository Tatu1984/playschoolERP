import { NextRequest } from "next/server";
import { opsService } from "@/backend/services/ops.service";
import { authed, qInt } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

export const GET = authed(async (req: NextRequest, _ctx: unknown, session) => {
  const scope = await resolveScope(session);
  return { notifications: await opsService.listNotifications(scope, qInt(req, "limit", 50)) };
});
