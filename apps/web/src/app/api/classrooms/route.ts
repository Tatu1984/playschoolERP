import { NextRequest } from "next/server";
import { schoolService } from "@/backend/services/school.service";
import { auditService } from "@/backend/services/audit.service";
import { createClassroomSchema } from "@/backend/validators/school.validator";
import { authed, created, q } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

export const GET = authed(async (req: NextRequest, _ctx: unknown, session) => {
  const scope = await resolveScope(session);
  return { classrooms: await schoolService.listClassrooms(scope, q(req, "branchId")) };
});

export const POST = authed(async (req: NextRequest, _ctx: unknown, session) => {
  const scope = await resolveScope(session);
  const classroom = await schoolService.createClassroom(scope, createClassroomSchema.parse(await req.json()));
  await auditService.record(session, { action: "classroom.create", target: classroom.name });
  return created({ classroom });
});
