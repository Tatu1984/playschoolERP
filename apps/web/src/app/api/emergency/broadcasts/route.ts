import { NextRequest } from "next/server";
import { opsService } from "@/backend/services/ops.service";
import { broadcastSchema } from "@/backend/validators/ops.validator";
import { auditService } from "@/backend/services/audit.service";
import { authed, created } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

export const GET = authed(async (_req: NextRequest, _ctx: unknown, session) => {
  return { safetyBroadcasts: await opsService.listBroadcasts(await resolveScope(session)) };
});

export const POST = authed(async (req: NextRequest, _ctx: unknown, session) => {
  const scope = await resolveScope(session);
  const broadcast = await opsService.broadcast(scope, broadcastSchema.parse(await req.json()));
  await auditService.record(session, {
    action: "safety.broadcast",
    target: broadcast.title,
    detail: broadcast.severity,
  });
  return created({ broadcast });
});
