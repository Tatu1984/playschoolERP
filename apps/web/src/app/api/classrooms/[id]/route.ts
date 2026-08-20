import { NextRequest, NextResponse } from "next/server";
import { schoolService } from "@/backend/services/school.service";
import { auditService } from "@/backend/services/audit.service";
import { updateClassroomSchema } from "@/backend/validators/school.validator";
import { authed } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

export const PATCH = authed(
  async (req: NextRequest, ctx: RouteContext<"/api/classrooms/[id]">, session) => {
    const { id } = await ctx.params;
    const scope = await resolveScope(session);
    const classroom = await schoolService.updateClassroom(scope, id, updateClassroomSchema.parse(await req.json()));
    await auditService.record(session, { action: "classroom.update", target: classroom.name });
    return { classroom };
  },
);

export const DELETE = authed(
  async (_req: NextRequest, ctx: RouteContext<"/api/classrooms/[id]">, session) => {
    const { id } = await ctx.params;
    const scope = await resolveScope(session);
    await schoolService.deleteClassroom(scope, id);
    await auditService.record(session, { action: "classroom.delete", target: id });
    return new NextResponse(null, { status: 204 });
  },
);
