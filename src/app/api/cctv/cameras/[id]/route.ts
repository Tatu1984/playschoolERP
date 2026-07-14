import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/backend/services/auth.service";
import { cctvService } from "@/backend/services/cctv.service";
import { toErrorResponse, UnauthorizedError } from "@/backend/utils/error-handler.util";

export const runtime = "nodejs";

const patchSchema = z.object({ enabled: z.boolean() });

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/cctv/cameras/[id]">) {
  try {
    const session = await getSession();
    if (!session) throw new UnauthorizedError();
    const { id } = await ctx.params;
    const { enabled } = patchSchema.parse(await req.json());
    const camera = await cctvService.setEnabled(session.role, id, enabled);
    return NextResponse.json({ camera });
  } catch (e) {
    return toErrorResponse(e);
  }
}
