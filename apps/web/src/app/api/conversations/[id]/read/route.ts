import { NextRequest } from "next/server";
import { messagingService } from "@/backend/services/messaging.service";
import { authed } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

export const POST = authed(async (_req: NextRequest, ctx: RouteContext<"/api/conversations/[id]/read">, session) => {
  const { id } = await ctx.params;
  return { conversation: await messagingService.markRead(await resolveScope(session), id) };
});
