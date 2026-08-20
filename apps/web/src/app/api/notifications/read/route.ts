import { NextRequest } from "next/server";
import { z } from "zod";
import { opsService } from "@/backend/services/ops.service";
import { authed } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

const schema = z.object({ id: z.string().optional(), all: z.boolean().optional() });

// One notification, or the whole bell.
export const POST = authed(async (req: NextRequest, _ctx: unknown, session) => {
  const scope = await resolveScope(session);
  const { id, all } = schema.parse(await req.json().catch(() => ({})));
  if (all || !id) return { markedRead: await opsService.markAllNotificationsRead(scope) };
  return { notification: await opsService.markNotificationRead(scope, id) };
});
