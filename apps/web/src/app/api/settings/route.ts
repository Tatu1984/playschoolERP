import { NextRequest } from "next/server";
import { opsService } from "@/backend/services/ops.service";
import { settingsSchema } from "@/backend/validators/ops.validator";
import { auditService } from "@/backend/services/audit.service";
import { authed, open } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

// Public: the site header needs the school name and the feature flags.
export const GET = open(async () => ({ settings: await opsService.settings() }));

export const PATCH = authed(async (req: NextRequest, _ctx: unknown, session) => {
  const scope = await resolveScope(session);
  const settings = await opsService.updateSettings(scope, settingsSchema.parse(await req.json()));
  await auditService.record(session, { action: "settings.update", target: settings.schoolName });
  return { settings };
});
