import { NextRequest } from "next/server";
import { schoolService } from "@/backend/services/school.service";
import { auditService } from "@/backend/services/audit.service";
import { updateStaffSchema } from "@/backend/validators/school.validator";
import { authed } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

export const PATCH = authed(
  async (req: NextRequest, ctx: RouteContext<"/api/staff/[id]">, session) => {
    const { id } = await ctx.params;
    const scope = await resolveScope(session);
    const member = await schoolService.updateStaff(scope, id, updateStaffSchema.parse(await req.json()));
    await auditService.record(session, { action: "staff.update", target: member.name });
    return { staff: member };
  },
);
