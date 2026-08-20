import { NextRequest } from "next/server";
import { learningService } from "@/backend/services/learning.service";
import { createLessonSchema } from "@/backend/validators/learning.validator";
import { authed, created, q } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

export const GET = authed(async (req: NextRequest, _ctx: unknown, session) => {
  const scope = await resolveScope(session);
  return {
    lessons: await learningService.listLessons(scope, {
      classroomId: q(req, "classroomId"),
      from: q(req, "from"),
      to: q(req, "to"),
    }),
  };
});

export const POST = authed(async (req: NextRequest, _ctx: unknown, session) => {
  const scope = await resolveScope(session);
  return created({ lesson: await learningService.createLesson(scope, createLessonSchema.parse(await req.json())) });
});
