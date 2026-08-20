import { NextRequest, NextResponse } from "next/server";
import { feedService } from "@/backend/services/feed.service";
import { auditService } from "@/backend/services/audit.service";
import { updateNoticeSchema } from "@/backend/validators/feed.validator";
import { authed } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

export const GET = authed(async (_req: NextRequest, ctx: RouteContext<"/api/notices/[id]">, session) => {
  const { id } = await ctx.params;
  return { notice: await feedService.getNotice(await resolveScope(session), id) };
});

export const PATCH = authed(async (req: NextRequest, ctx: RouteContext<"/api/notices/[id]">, session) => {
  const { id } = await ctx.params;
  const scope = await resolveScope(session);
  const notice = await feedService.updateNotice(scope, id, updateNoticeSchema.parse(await req.json()));
  await auditService.record(session, { action: "notice.update", target: notice.title });
  return { notice };
});

export const DELETE = authed(async (_req: NextRequest, ctx: RouteContext<"/api/notices/[id]">, session) => {
  const { id } = await ctx.params;
  await feedService.removeNotice(await resolveScope(session), id);
  await auditService.record(session, { action: "notice.delete", target: id });
  return new NextResponse(null, { status: 204 });
});
