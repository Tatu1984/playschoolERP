import { NextRequest } from "next/server";
import { feedService } from "@/backend/services/feed.service";
import { auditService } from "@/backend/services/audit.service";
import { createNoticeSchema } from "@/backend/validators/feed.validator";
import { authed, created } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

export const GET = authed(async (_req: NextRequest, _ctx: unknown, session) => {
  return { notices: await feedService.listNotices(await resolveScope(session)) };
});

export const POST = authed(async (req: NextRequest, _ctx: unknown, session) => {
  const scope = await resolveScope(session);
  const notice = await feedService.createNotice(scope, createNoticeSchema.parse(await req.json()));
  await auditService.record(session, { action: "notice.create", target: notice.title });
  return created({ notice });
});
