import { NextRequest } from "next/server";
import { kidsService } from "@/backend/services/kids.service";
import { authed } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

// Journeys for everyone this login may see, plus the badge definitions to
// render them against — the rewards locker in one call.
export const GET = authed(async (_req: NextRequest, _ctx: unknown, session) => {
  const scope = await resolveScope(session);
  const [journeys, { badges }] = await Promise.all([
    kidsService.journeysFor(scope),
    kidsService.catalogue(),
  ]);
  return { journeys, badges };
});
