import { NextRequest, NextResponse } from "next/server";
import { kidsService } from "@/backend/services/kids.service";
import { authed } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

export const DELETE = authed(async (_req: NextRequest, ctx: RouteContext<"/api/artworks/[id]">, session) => {
  const { id } = await ctx.params;
  await kidsService.deleteArtwork(await resolveScope(session), id);
  return new NextResponse(null, { status: 204 });
});
