import { NextRequest } from "next/server";
import { kidsService } from "@/backend/services/kids.service";
import { open } from "@/backend/utils/route.util";

export const runtime = "nodejs";

export const GET = open(async (_req: NextRequest, ctx: RouteContext<"/api/games/[slug]">) => {
  const { slug } = await ctx.params;
  return { game: await kidsService.getGame(slug) };
});
