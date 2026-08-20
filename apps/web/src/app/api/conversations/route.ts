import { NextRequest } from "next/server";
import { messagingService } from "@/backend/services/messaging.service";
import { startConversationSchema } from "@/backend/validators/messaging.validator";
import { authed, created } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

export const GET = authed(async (_req: NextRequest, _ctx: unknown, session) => {
  return { conversations: await messagingService.listConversations(await resolveScope(session)) };
});

export const POST = authed(async (req: NextRequest, _ctx: unknown, session) => {
  const scope = await resolveScope(session);
  return created(await messagingService.start(scope, startConversationSchema.parse(await req.json())));
});
