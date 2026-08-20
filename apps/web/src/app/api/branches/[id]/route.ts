import { NextRequest } from "next/server";
import { schoolService } from "@/backend/services/school.service";
import { auditService } from "@/backend/services/audit.service";
import { updateBranchSchema } from "@/backend/validators/school.validator";
import { authed } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

export const PATCH = authed(
  async (req: NextRequest, ctx: RouteContext<"/api/branches/[id]">, session) => {
    const { id } = await ctx.params;
    const scope = await resolveScope(session);
    const branch = await schoolService.updateBranch(scope, id, updateBranchSchema.parse(await req.json()));
    await auditService.record(session, { action: "branch.update", target: branch.name });
    return { branch };
  },
);
