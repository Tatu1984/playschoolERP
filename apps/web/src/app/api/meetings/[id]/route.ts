import { NextRequest } from "next/server";
import { messagingService } from "@/backend/services/messaging.service";
import { meetingStatusSchema } from "@/backend/validators/messaging.validator";
import { authed } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

export const PATCH = authed(async (req: NextRequest, ctx: RouteContext<"/api/meetings/[id]">, session) => {
  const { id } = await ctx.params;
  const scope = await resolveScope(session);
  const { status } = meetingStatusSchema.parse(await req.json());
  return { meeting: await messagingService.setMeetingStatus(scope, id, status) };
});
