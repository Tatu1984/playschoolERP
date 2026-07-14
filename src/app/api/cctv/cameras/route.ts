import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/backend/services/auth.service";
import { cctvService } from "@/backend/services/cctv.service";
import { createCameraSchema } from "@/backend/validators/cctv.validator";
import { isStaff } from "@/backend/utils/rbac.util";
import { toErrorResponse, UnauthorizedError } from "@/backend/utils/error-handler.util";

export const runtime = "nodejs";

// Parents get their permitted cameras; staff get the full management list.
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) throw new UnauthorizedError();
    if (isStaff(session.role)) {
      const branchId = req.nextUrl.searchParams.get("branchId") ?? undefined;
      const cameras = await cctvService.listCameras(session.role, branchId);
      return NextResponse.json({ cameras });
    }
    const cameras = await cctvService.listForParent(session.sub);
    return NextResponse.json({ cameras });
  } catch (e) {
    return toErrorResponse(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) throw new UnauthorizedError();
    const input = createCameraSchema.parse(await req.json());
    const camera = await cctvService.createCamera(session.role, input);
    return NextResponse.json({ camera }, { status: 201 });
  } catch (e) {
    return toErrorResponse(e);
  }
}
