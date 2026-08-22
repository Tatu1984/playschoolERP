import { after, NextRequest } from "next/server";
import { opsService } from "@/backend/services/ops.service";
import { broadcastSchema } from "@/backend/validators/ops.validator";
import { auditService } from "@/backend/services/audit.service";
import { authed, created } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";
import { notificationService } from "@/backend/services/notification.service";
import { logger } from "@/backend/utils/logger.util";

export const runtime = "nodejs";
// The fan-out runs after the response, inside this same invocation, so it needs
// room beyond the request itself. A branch-wide broadcast is one batched push
// call and a few dozen emails.
export const maxDuration = 60;

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

  // Push and email go out after the response. The in-app notifications are
  // already written by `broadcast()` above, so the portal shows the message
  // whatever happens here; this is the part that involves other people's
  // servers, and the head teacher should not watch a spinner through it.
  //
  // Failures inside are recorded per recipient on NotificationDelivery, which
  // is what the screen reads to say who was not reached.
  after(async () => {
    try {
      await notificationService.deliverBroadcast(broadcast.id);
    } catch (e) {
      logger.error("Safety broadcast delivery failed outright", e, { broadcastId: broadcast.id });
    }
  });

  return created({ broadcast });
});
