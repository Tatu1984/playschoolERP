import { NextRequest } from "next/server";
import { schoolService } from "@/backend/services/school.service";
import { auditService } from "@/backend/services/audit.service";
import { createStaffSchema } from "@/backend/validators/school.validator";
import { authed, created } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

export const GET = authed(async (_req: NextRequest, _ctx: unknown, session) => {
  const scope = await resolveScope(session);
  return { staff: await schoolService.listStaff(scope) };
});

export const POST = authed(async (req: NextRequest, _ctx: unknown, session) => {
  const scope = await resolveScope(session);
  const member = await schoolService.createStaff(scope, createStaffSchema.parse(await req.json()));
  await auditService.record(session, { action: "staff.create", target: member.name, detail: member.role });
  return created({ staff: member });
});
