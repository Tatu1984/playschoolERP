/**
 * Photographs of children: taking them in, and letting exactly the right
 * people see them.
 *
 * The ERP had no binary upload path at all. `mediaAssets`, activity photos and
 * artwork were URL metadata pointing at nothing, which meant the headline
 * feature of a playschool ERP — the daily photo feed — did not exist. The only
 * thing in the codebase that accepted a file was the marketing gallery, and it
 * stores public blobs, which is right for advertising and wrong for this.
 *
 * Four rules, and each one is here because of a specific way this goes wrong:
 *
 *  1. **The bytes are private.** Stored through `blobStore`, read back only by
 *     this server. There is no URL anybody can forward.
 *  2. **Every read is scoped.** A photograph belongs to a classroom; a parent
 *     may see it if their child is tagged on a post carrying it, staff if they
 *     teach that room, an admin within their branch. `/api/media/[id]` asks
 *     before it streams.
 *  3. **The metadata is stripped before storage**, not on the way out. A
 *     nursery photograph carries the GPS position of a two-year-old.
 *  4. **A child whose family refused photography is not in the picture.** The
 *     refusal excludes them from tagged, photographed posts rather than hiding
 *     a post that has already been taken — see `assertPhotoConsent`.
 */
import { randomBytes } from "node:crypto";
import { prisma } from "@/backend/database/client";
import { blobStore } from "@/backend/integrations/storage";
import { AppError, ForbiddenError, NotFoundError } from "@/backend/utils/error-handler.util";
import { signMediaToken } from "@/backend/utils/jwt.util";
import { logger } from "@/backend/utils/logger.util";
import {
  ALLOWED_IMAGE_TYPES,
  safeFileName,
  sniffImageFormat,
  stripImageMetadata,
} from "@/backend/utils/image-metadata.util";
import { canSeeStudent, type Scope } from "@/backend/utils/scope.util";
import { ROLES } from "@/shared/constants/roles";

/**
 * Ten megabytes. A phone photograph is two to five; anything much past this is
 * a video or a mistake, and the ERP feed takes neither yet.
 */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export interface UploadedMedia {
  id: string;
  /** Where the portal fetches it. Not a blob URL — there isn't one. */
  url: string;
  contentType: string;
  sizeBytes: number;
  originalName: string;
}

export const mediaService = {
  /**
   * Accept a photograph.
   *
   * The order matters: size, then the file's own magic bytes, then the strip,
   * then storage. Nothing is written anywhere until the file has proved what it
   * is — an upload endpoint that stores first and validates later has stored the
   * thing it was about to reject.
   */
  async upload(
    scope: Scope,
    file: { bytes: Uint8Array; name: string; declaredType: string },
    target: { classroomId?: string } = {},
  ): Promise<UploadedMedia> {
    if (scope.role === ROLES.PARENT) {
      throw new ForbiddenError("Only staff can upload to the school's feed");
    }
    if (file.bytes.length === 0) throw new AppError("That file is empty", 400, "empty_file");
    if (file.bytes.length > MAX_UPLOAD_BYTES) {
      throw new AppError("That photo is larger than 10MB", 413, "file_too_large");
    }

    // The browser's Content-Type and the extension are both the uploader's to
    // choose. The first bytes are not.
    const format = sniffImageFormat(file.bytes);
    if (!format) {
      throw new AppError(
        "That file is not a photo this school's feed accepts (JPEG, PNG, WebP or GIF)",
        415,
        "unsupported_media_type",
      );
    }

    if (target.classroomId && !canPostToClassroom(scope, target.classroomId)) {
      throw new ForbiddenError("That classroom is not yours to post in");
    }

    const contentType = ALLOWED_IMAGE_TYPES[format];
    const scrubbed = stripImageMetadata(file.bytes, format);

    // 32 hex characters of randomness in the key. Even if the private blob
    // store were one day misconfigured to public, the key is not guessable and
    // not derived from the child's name or the file's.
    const storageKey = `erp/media/${randomBytes(16).toString("hex")}`;

    await blobStore.put(storageKey, scrubbed, contentType);

    const row = await prisma.mediaObject.create({
      data: {
        storageKey,
        contentType,
        kind: "image",
        sizeBytes: scrubbed.length,
        originalName: safeFileName(file.name),
        branchId: scope.branchId,
        classroomId: target.classroomId ?? null,
        uploadedById: scope.userId || null,
        scrubbed: true,
        createdAt: new Date(),
      },
    });

    logger.info("Photo uploaded", {
      mediaId: row.id,
      classroomId: target.classroomId,
      bytesIn: file.bytes.length,
      bytesStored: scrubbed.length,
      store: blobStore.name,
    });

    return {
      id: row.id,
      url: `/api/media/${row.id}`,
      contentType,
      sizeBytes: scrubbed.length,
      originalName: row.originalName,
    };
  },

  /**
   * May this login see this photograph, and if so, what are the bytes?
   *
   * The check is deliberately not "is it in your branch". A photograph reaches
   * a parent because their child is tagged on a post that carries it, which is
   * the same rule the feed itself uses — otherwise a parent could read every
   * photograph taken at their campus by walking ids.
   */
  async read(scope: Scope, mediaId: string): Promise<{ body: Uint8Array; contentType: string }> {
    const media = await prisma.mediaObject.findUnique({ where: { id: mediaId } });
    if (!media) throw new NotFoundError("Photo not found");
    if (!media.scrubbed) {
      // Nothing writes such a row today. If one ever appears — an import, an
      // older path — it is not served until somebody has looked at it.
      logger.error("Refused to serve a photo that was never scrubbed", undefined, { mediaId });
      throw new NotFoundError("Photo not found");
    }

    if (!(await canSeeMedia(scope, media))) throw new ForbiddenError();

    const object = await blobStore.get(media.storageKey);
    if (!object) {
      logger.error("A photo row has no object behind it", undefined, { mediaId });
      throw new NotFoundError("Photo not found");
    }
    return { body: object.body, contentType: media.contentType };
  },

  /**
   * A short-lived URL for a client that cannot send the session cookie.
   *
   * Five minutes, one object, one user. Long enough to render a feed, short
   * enough that a link pasted into a chat is dead before anybody opens it.
   */
  async signedUrl(scope: Scope, mediaId: string, ttlSeconds = 300): Promise<string> {
    const media = await prisma.mediaObject.findUnique({ where: { id: mediaId } });
    if (!media) throw new NotFoundError("Photo not found");
    if (!(await canSeeMedia(scope, media))) throw new ForbiddenError();
    const token = await signMediaToken({ sub: scope.userId, mediaId }, ttlSeconds);
    return `/api/media/${mediaId}?token=${token}`;
  },

  /**
   * Refuse to photograph a child whose family said no.
   *
   * Called when a post carrying photographs names the children in it. The
   * refusal is loud and names them, because the teacher needs to know which
   * child to leave out — a silent drop would look like the post worked and
   * quietly publish a group photo with one child's parents never seeing it,
   * which is the opposite of what consent means.
   */
  async assertPhotoConsent(studentIds: string[]): Promise<void> {
    if (studentIds.length === 0) return;

    const [consents, students] = await Promise.all([
      prisma.photoConsent.findMany({ where: { studentId: { in: studentIds } } }),
      prisma.student.findMany({
        where: { id: { in: studentIds } },
        select: { id: true, firstName: true, lastName: true },
      }),
    ]);

    const allowed = new Set(consents.filter((c) => c.allowed).map((c) => c.studentId));
    const refused = students.filter((s) => !allowed.has(s.id));
    if (refused.length === 0) return;

    const names = refused.map((s) => `${s.firstName} ${s.lastName}`.trim()).join(", ");
    throw new AppError(
      `No photo consent on file for ${names}. Remove ${refused.length === 1 ? "that child" : "those children"} from this post, or post it without photos.`,
      403,
      "photo_consent_missing",
    );
  },

  /** What the office and the family see on the consent screen. */
  async getConsent(scope: Scope, studentId: string) {
    if (!(await canSeeStudent(scope, studentId))) throw new ForbiddenError();
    const row = await prisma.photoConsent.findUnique({ where: { studentId } });
    return {
      studentId,
      // No row is a refusal, not an unknown: nobody has given permission.
      allowed: row?.allowed ?? false,
      recorded: row !== null,
      decidedByName: row?.decidedByName ?? "",
      decidedAt: row?.decidedAt?.toISOString() ?? null,
      note: row?.note ?? "",
    };
  },

  /**
   * Record an answer.
   *
   * A parent may answer for their own child; an admin may record what a family
   * told the office, which is how most of these actually arrive. A teacher may
   * not: they are the people the answer constrains.
   */
  async setConsent(
    scope: Scope,
    studentId: string,
    input: { allowed: boolean; note?: string },
  ) {
    if (!(await canSeeStudent(scope, studentId))) throw new ForbiddenError();
    const mayDecide =
      scope.role === ROLES.PARENT || scope.role === ROLES.ADMIN || scope.role === ROLES.SUPER_ADMIN;
    if (!mayDecide) {
      throw new ForbiddenError("Only a parent or the office can record photo consent");
    }

    const now = new Date();
    await prisma.photoConsent.upsert({
      where: { studentId },
      update: {
        allowed: input.allowed,
        note: input.note ?? "",
        decidedById: scope.userId || null,
        decidedByName: scope.name,
        decidedAt: now,
      },
      create: {
        studentId,
        allowed: input.allowed,
        note: input.note ?? "",
        decidedById: scope.userId || null,
        decidedByName: scope.name,
        decidedAt: now,
      },
    });

    logger.info("Photo consent recorded", {
      studentId,
      allowed: input.allowed,
      byRole: scope.role,
    });

    return this.getConsent(scope, studentId);
  },
};

function canPostToClassroom(scope: Scope, classroomId: string): boolean {
  if (scope.role === ROLES.SUPER_ADMIN) return true;
  return scope.classroomIds.includes(classroomId);
}

/**
 * The read rule.
 *
 * Staff: the room it belongs to, or their branch for an admin. Parents: only
 * through a post their own child is tagged on. A photograph with no classroom
 * and no post — freshly uploaded, not yet attached — is visible to the person
 * who uploaded it and to their branch's admins, and to nobody else.
 */
async function canSeeMedia(
  scope: Scope,
  media: { id: string; branchId: string | null; classroomId: string | null; uploadedById: string | null },
): Promise<boolean> {
  if (scope.role === ROLES.SUPER_ADMIN) return true;
  if (!scope.userId) return false;

  if (scope.role === ROLES.PARENT) {
    if (scope.studentIds.length === 0) return false;
    // Is it on a published post one of my children is tagged on?
    const post = await prisma.activity.findFirst({
      where: {
        published: true,
        taggedStudents: { some: { studentId: { in: scope.studentIds } } },
        media: { array_contains: [{ id: media.id }] },
      },
      select: { id: true },
    });
    return post !== null;
  }

  if (scope.role === ROLES.ADMIN) return media.branchId === scope.branchId;

  // Teacher: the room they teach, or something they uploaded themselves and
  // has not been attached to a post yet.
  if (media.classroomId) return scope.classroomIds.includes(media.classroomId);
  return media.uploadedById === scope.userId;
}
