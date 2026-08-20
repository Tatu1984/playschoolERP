import { NextRequest } from "next/server";
import { opsService } from "@/backend/services/ops.service";
import { deviceSchema } from "@/backend/validators/ops.validator";
import { authed, created } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

export const GET = authed(async (_req: NextRequest, _ctx: unknown, session) => {
  return { devices: await opsService.listDevices(await resolveScope(session)) };
});

// The Expo app calls this on launch. Keyed on the push token, so a reinstall
// replaces the row rather than leaving a dead device behind.
export const POST = authed(async (req: NextRequest, _ctx: unknown, session) => {
  const scope = await resolveScope(session);
  return created({ device: await opsService.registerDevice(scope, deviceSchema.parse(await req.json())) });
});
