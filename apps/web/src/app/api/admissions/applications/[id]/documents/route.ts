import { NextRequest } from "next/server";
import { z } from "zod";
import { admissionService } from "@/backend/services/admission.service";
import { authed } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";

export const runtime = "nodejs";

const schema = z.object({ docId: z.string().min(1) });

// Tick a document off the checklist. The last one moves the application on.
export const POST = authed(async (req: NextRequest, ctx: RouteContext<"/api/admissions/applications/[id]/documents">, session) => {
  const { id } = await ctx.params;
  const scope = await resolveScope(session);
  const { docId } = schema.parse(await req.json());
  return { application: await admissionService.toggleApplicationDoc(scope, id, docId) };
});
