import { NextRequest } from "next/server";
import { auditService } from "@/backend/services/audit.service";
import { authed, qInt } from "@/backend/utils/route.util";
import { requireRole } from "@/backend/utils/rbac.util";
import { ROLES } from "@/shared/constants/roles";

export const runtime = "nodejs";

export const GET = authed(async (req: NextRequest, _ctx: unknown, session) => {
  requireRole(session.role, [ROLES.SUPER_ADMIN, ROLES.ADMIN]);
  return { auditEntries: await auditService.list(qInt(req, "limit", 200)) };
});
