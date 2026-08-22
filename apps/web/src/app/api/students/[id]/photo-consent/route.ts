import { NextRequest } from "next/server";
import { z } from "zod";
import { mediaService } from "@/backend/services/media.service";
import { auditService } from "@/backend/services/audit.service";
import { authed } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";
import { clientIp } from "@/backend/utils/rate-limit.util";

export const runtime = "nodejs";

const consentSchema = z.object({
  allowed: z.boolean(),
  note: z.string().max(500).optional(),
});

type Ctx = { params: Promise<{ id: string }> };

/** What is on file for this child. Absence of a record reads as "not allowed". */
export const GET = authed(async (_req: NextRequest, ctx: Ctx, session) => {
  const { id } = await ctx.params;
  return { photoConsent: await mediaService.getConsent(await resolveScope(session), id) };
});

/**
 * Record an answer. A parent answers for their own child; the office records
 * what a family told them, which is how most of these arrive.
 *
 * Audited on purpose: "who said this child could be photographed, and when" is
 * exactly the question that gets asked afterwards.
 */
export const PUT = authed(async (req: NextRequest, ctx: Ctx, session) => {
  const { id } = await ctx.params;
  const scope = await resolveScope(session);
  const input = consentSchema.parse(await req.json());
  const photoConsent = await mediaService.setConsent(scope, id, input);

  await auditService.record(session, {
    action: input.allowed ? "photo-consent.grant" : "photo-consent.refuse",
    target: id,
    detail: input.note ?? "",
    ip: clientIp(req),
  });

  return { photoConsent };
});
