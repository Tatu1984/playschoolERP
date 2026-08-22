import { NextRequest } from "next/server";
import { mediaService, MAX_UPLOAD_BYTES } from "@/backend/services/media.service";
import { auditService } from "@/backend/services/audit.service";
import { authed, created } from "@/backend/utils/route.util";
import { resolveScope } from "@/backend/utils/scope.util";
import { AppError } from "@/backend/utils/error-handler.util";
import { clientIp, enforceRateLimit, UPLOAD_LIMIT } from "@/backend/utils/rate-limit.util";

export const runtime = "nodejs";

/**
 * Upload a photograph.
 *
 * Multipart, because that is what a file input sends. The body is read into
 * memory — bounded by the size check inside the service, and by the same check
 * here before the bytes are even copied, so a 400MB upload is refused rather
 * than buffered first.
 */
export const POST = authed(async (req: NextRequest, _ctx: unknown, session) => {
  const scope = await resolveScope(session);
  await enforceRateLimit(UPLOAD_LIMIT, session.sub);

  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > MAX_UPLOAD_BYTES * 1.1) {
    throw new AppError("That photo is larger than 10MB", 413, "file_too_large");
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    throw new AppError("No file was sent", 400, "no_file");
  }

  const classroomId = typeof form.get("classroomId") === "string"
    ? (form.get("classroomId") as string)
    : undefined;

  const media = await mediaService.upload(
    scope,
    {
      bytes: new Uint8Array(await file.arrayBuffer()),
      name: file.name,
      declaredType: file.type,
    },
    { classroomId },
  );

  await auditService.record(session, {
    action: "media.upload",
    target: media.id,
    detail: media.originalName,
    ip: clientIp(req),
  });

  return created({ media });
});
