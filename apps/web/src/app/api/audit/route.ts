import { NextRequest } from "next/server";
import { auditService } from "@/backend/services/audit.service";
import { authed, qInt } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";
import { requireRole } from "@/backend/utils/rbac.util";
import { ROLES } from "@/shared/constants/roles";

export const runtime = "nodejs";

export const GET = authed(async (req: NextRequest, _ctx: unknown, session) => {
  requireRole(session.role, [ROLES.SUPER_ADMIN, ROLES.ADMIN]);
  // Scoped, not just role-gated: ADMIN is a branch role, and the trail is a
  // branch's record of itself.
  const scope = await resolveScope(session);
  return { auditEntries: await auditService.list(scope, qInt(req, "limit", 200)) };
});
