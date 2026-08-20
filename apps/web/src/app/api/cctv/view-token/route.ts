import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/backend/services/auth.service";
import { cctvService } from "@/backend/services/cctv.service";
import { viewTokenRequestSchema } from "@/backend/validators/cctv.validator";
import { toErrorResponse, UnauthorizedError } from "@/backend/utils/error-handler.util";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) throw new UnauthorizedError();
    const { cameraId } = viewTokenRequestSchema.parse(await req.json());
    const result = await cctvService.issueViewToken(
      session.sub,
      session.role,
      cameraId,
      {
        ip: req.headers.get("x-forwarded-for") ?? undefined,
        userAgent: req.headers.get("user-agent") ?? undefined,
      },
    );
    return NextResponse.json(result);
  } catch (e) {
    return toErrorResponse(e);
  }
}
