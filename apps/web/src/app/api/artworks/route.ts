import { NextRequest } from "next/server";
import { kidsService } from "@/backend/services/kids.service";
import { artworkSchema } from "@/backend/validators/kids.validator";
import { authed, created, q } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

export const GET = authed(async (req: NextRequest, _ctx: unknown, session) => {
  const scope = await resolveScope(session);
  return { artworks: await kidsService.listArtwork(scope, q(req, "studentId")) };
});

export const POST = authed(async (req: NextRequest, _ctx: unknown, session) => {
  const scope = await resolveScope(session);
  const { studentId, title, dataUrl } = artworkSchema.parse(await req.json());
  return created({ artwork: await kidsService.saveArtwork(scope, studentId, title, dataUrl) });
});
