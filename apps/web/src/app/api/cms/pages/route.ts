import { open } from "@/backend/utils/route.util";
import { cmsService } from "@/backend/services/cms.service";
import { getSession } from "@/backend/services/auth.service";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

export const GET = open(async () => {
  const session = await getSession();
  const scope = session ? await resolveScope(session) : null;
  return { cmsPages: await cmsService.listPages(scope) };
});
