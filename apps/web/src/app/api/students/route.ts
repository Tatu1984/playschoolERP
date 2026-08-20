import { NextRequest } from "next/server";
import { schoolService } from "@/backend/services/school.service";
import { auditService } from "@/backend/services/audit.service";
import { createStudentSchema } from "@/backend/validators/school.validator";
import { authed, created, q } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

// Branch-scoped for admins, classroom-scoped for teachers, own-children for
// parents — the service decides, so the same URL is safe for all three.
export const GET = authed(async (req: NextRequest, _ctx: unknown, session) => {
  const scope = await resolveScope(session);
  const students = await schoolService.listStudents(scope, {
    classroomId: q(req, "classroomId"),
    branchId: q(req, "branchId"),
  });
  return { students };
});

export const POST = authed(async (req: NextRequest, _ctx: unknown, session) => {
  const scope = await resolveScope(session);
  const student = await schoolService.createStudent(scope, createStudentSchema.parse(await req.json()));
  await auditService.record(session, {
    action: "student.enrol",
    target: `${student.firstName} ${student.lastName}`,
    detail: student.admissionNo,
  });
  return created({ student });
});
