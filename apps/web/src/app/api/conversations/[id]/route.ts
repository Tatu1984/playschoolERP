import { NextRequest } from "next/server";
import { z } from "zod";
import { messagingService } from "@/backend/services/messaging.service";
import { authed } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

const patchSchema = z.object({ archived: z.boolean() });

export const PATCH = authed(async (req: NextRequest, ctx: RouteContext<"/api/conversations/[id]">, session) => {
  const { id } = await ctx.params;
  const scope = await resolveScope(session);
  const { archived } = patchSchema.parse(await req.json());
  return { conversation: await messagingService.setArchived(scope, id, archived) };
});
