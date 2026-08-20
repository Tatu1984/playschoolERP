import { NextRequest } from "next/server";
import { kidsService } from "@/backend/services/kids.service";
import { finishGameSchema } from "@/backend/validators/kids.validator";
import { authed, created, q } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

export const GET = authed(async (req: NextRequest, _ctx: unknown, session) => {
  const scope = await resolveScope(session);
  return { gameSessions: await kidsService.sessions(scope, q(req, "studentId")) };
});

/**
 * Completing a game. The body reports what happened; the server decides what it
 * was worth, so the stars in the database are not whatever the console says.
 */
export const POST = authed(async (req: NextRequest, _ctx: unknown, session) => {
  const scope = await resolveScope(session);
  return created(await kidsService.finishGame(scope, finishGameSchema.parse(await req.json())));
});
