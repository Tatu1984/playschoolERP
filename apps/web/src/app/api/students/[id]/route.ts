import { NextRequest, NextResponse } from "next/server";
import { schoolService } from "@/backend/services/school.service";
import { auditService } from "@/backend/services/audit.service";
import { updateStudentSchema } from "@/backend/validators/school.validator";
import { authed } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

export const GET = authed(
  async (_req: NextRequest, ctx: RouteContext<"/api/students/[id]">, session) => {
    const { id } = await ctx.params;
    const scope = await resolveScope(session);
    return { student: await schoolService.getStudent(scope, id) };
  },
);

export const PATCH = authed(
  async (req: NextRequest, ctx: RouteContext<"/api/students/[id]">, session) => {
    const { id } = await ctx.params;
    const scope = await resolveScope(session);
    const student = await schoolService.updateStudent(scope, id, updateStudentSchema.parse(await req.json()));
    await auditService.record(session, {
      action: "student.update",
      target: `${student.firstName} ${student.lastName}`,
    });
    return { student };
  },
);

export const DELETE = authed(
  async (_req: NextRequest, ctx: RouteContext<"/api/students/[id]">, session) => {
    const { id } = await ctx.params;
    const scope = await resolveScope(session);
    await schoolService.deleteStudent(scope, id);
    await auditService.record(session, { action: "student.delete", target: id });
    return new NextResponse(null, { status: 204 });
  },
);
