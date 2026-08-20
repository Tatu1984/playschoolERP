import { NextRequest } from "next/server";
import { schoolService } from "@/backend/services/school.service";
import { open } from "@/backend/utils/route.util";

export const runtime = "nodejs";

export const GET = open(async (_req: NextRequest, ctx: RouteContext<"/api/programs/[slug]">) => {
  const { slug } = await ctx.params;
  return { program: await schoolService.getProgram(slug) };
});
