import { NextRequest } from "next/server";
import { schoolService } from "@/backend/services/school.service";
import { auditService } from "@/backend/services/audit.service";
import { createBranchSchema } from "@/backend/validators/school.validator";
import { authed, created } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

export const GET = authed(async (_req: NextRequest, _ctx: unknown, session) => {
  const scope = await resolveScope(session);
  return { branches: await schoolService.listBranches(scope) };
});

export const POST = authed(async (req: NextRequest, _ctx: unknown, session) => {
  const scope = await resolveScope(session);
  const branch = await schoolService.createBranch(scope, createBranchSchema.parse(await req.json()));
  await auditService.record(session, { action: "branch.create", target: branch.name });
  return created({ branch });
});
