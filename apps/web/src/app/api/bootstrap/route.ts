import { NextRequest } from "next/server";
import { bootstrapService } from "@/backend/services/bootstrap.service";
import { authed } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

/**
 * Everything this login may see, in one call. What a role may not see is never
 * queried, not filtered afterwards.
 */
export const GET = authed(async (_req: NextRequest, _ctx: unknown, session) => {
  const scope = await resolveScope(session);
  return { data: await bootstrapService.snapshot(scope) };
});
