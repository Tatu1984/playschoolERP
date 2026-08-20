import { NextRequest } from "next/server";
import { messagingService } from "@/backend/services/messaging.service";
import { sendMessageSchema } from "@/backend/validators/messaging.validator";
import { authed, created } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

export const GET = authed(async (_req: NextRequest, ctx: RouteContext<"/api/conversations/[id]/messages">, session) => {
  const { id } = await ctx.params;
  return { messages: await messagingService.listMessages(await resolveScope(session), id) };
});

export const POST = authed(async (req: NextRequest, ctx: RouteContext<"/api/conversations/[id]/messages">, session) => {
  const { id } = await ctx.params;
  const scope = await resolveScope(session);
  return created({ message: await messagingService.send(scope, id, sendMessageSchema.parse(await req.json())) });
});
