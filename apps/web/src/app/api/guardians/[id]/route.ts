import { NextRequest } from "next/server";
import { schoolService } from "@/backend/services/school.service";
import { updateGuardianSchema } from "@/backend/validators/school.validator";
import { authed } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

export const PATCH = authed(
  async (req: NextRequest, ctx: RouteContext<"/api/guardians/[id]">, session) => {
    const { id } = await ctx.params;
    const scope = await resolveScope(session);
    return { guardian: await schoolService.updateGuardian(scope, id, updateGuardianSchema.parse(await req.json())) };
  },
);
