import { NextRequest } from "next/server";
import { opsService } from "@/backend/services/ops.service";
import { rolePermissionsSchema } from "@/backend/validators/ops.validator";
import { auditService } from "@/backend/services/audit.service";
import { authed } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

export const GET = authed(async (_req: NextRequest, _ctx: unknown, session) => {
  return { roleDefinitions: await opsService.listRoles(await resolveScope(session)) };
});

export const PATCH = authed(async (req: NextRequest, _ctx: unknown, session) => {
  const scope = await resolveScope(session);
  const { role, permissions } = rolePermissionsSchema.parse(await req.json());
  const definition = await opsService.setRolePermissions(scope, role, permissions);
  await auditService.record(session, {
    action: "role.permissions",
    target: role,
    detail: permissions.join(", "),
  });
  return { roleDefinition: definition };
});
