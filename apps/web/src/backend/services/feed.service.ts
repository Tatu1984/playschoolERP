/**
 * The daily activity feed and the notice board (SoW §7.7, §7.8).
 *
 * Visibility is the whole job here:
 *
 *  * A parent sees a post only if it is published *and* tags one of their
 *    children. Being in the same classroom is not enough — a photo of someone
 *    else's child is not theirs to see.
 *  * Drafts never leave the staffroom, and neither does `internalNote`.
 *  * Notices respect their audience: STAFF notices are invisible to parents,
 *    CLASSROOM notices only reach that room, and unpublished ones reach nobody.
 */
import { type Prisma } from "@/backend/database/client";
import { feedRepository } from "@/backend/repositories/feed.repository";
import { mediaService } from "@/backend/services/media.service";
import { toActivity, toNotice } from "@/backend/mappers";
import { ForbiddenError, NotFoundError } from "@/backend/utils/error-handler.util";
import { requireRole } from "@/backend/utils/rbac.util";
import type { Scope } from "@/backend/utils/scope.util";
import { ROLES, type Role } from "@/shared/constants/roles";
import type { Activity, Notice } from "@/shared/types/engagement.types";
import type {
  CreateActivityInput,
  CreateNoticeInput,
  UpdateActivityInput,
  UpdateNoticeInput,
} from "@/backend/validators/feed.validator";

const AUTHORS: Role[] = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER];
const isParent = (scope: Scope) => scope.role === ROLES.PARENT;

export const feedService = {
  // ---------------------------------------------------------------- feed
  activityWhere(scope: Scope, filters: { classroomId?: string } = {}): Prisma.ActivityWhereInput {
    if (isParent(scope)) {
      return {
        published: true,
        taggedStudents: { some: { studentId: { in: scope.studentIds } } },
      };
    }
    const where: Prisma.ActivityWhereInput = {};
    if (filters.classroomId) where.classroomId = filters.classroomId;
    if (scope.role === ROLES.TEACHER) where.classroomId = { in: scope.classroomIds };
    else if (scope.branchId) where.classroom = { branchId: scope.branchId };
    return where;
  },

  async list(scope: Scope, filters: { classroomId?: string } = {}): Promise<Activity[]> {
    const rows = await feedRepository.listActivities(this.activityWhere(scope, filters));
    return rows.map((r) => toActivity(r, { forParent: isParent(scope) }));
  },

  async get(scope: Scope, id: string): Promise<Activity> {
    const row = await feedRepository.findActivity(id);
    if (!row) throw new NotFoundError("Post not found");
    if (isParent(scope)) {
      const mine = row.taggedStudents.some((t) => scope.studentIds.includes(t.studentId));
      if (!row.published || !mine) throw new ForbiddenError();
    }
    return toActivity(row, { forParent: isParent(scope) });
  },

  async create(scope: Scope, input: CreateActivityInput): Promise<Activity> {
    requireRole(scope.role, AUTHORS);
    if (!scope.staffId) throw new ForbiddenError("Only a staff member can post to a class feed");
    if (scope.role === ROLES.TEACHER && !scope.classroomIds.includes(input.classroomId)) {
      throw new ForbiddenError("That classroom is not yours to post in");
    }
    const { studentIds, media, ...rest } = input;
    // A photographed post may only name children whose families have said yes.
    // The check is here rather than in the UI because the UI is not the thing
    // that has to be right: this is the moment a child's photograph becomes
    // visible to other people, and consent is the only thing standing in front
    // of it. A post with no photographs is unaffected — a written note about a
    // child is not a photograph of one.
    if (media.length > 0) await mediaService.assertPhotoConsent(studentIds);

    const row = await feedRepository.createActivity(
      {
        ...rest,
        media: media as Prisma.InputJsonValue,
        authorStaffId: scope.staffId,
      },
      studentIds,
    );
    return toActivity(row);
  },

  async update(scope: Scope, id: string, input: UpdateActivityInput): Promise<Activity> {
    requireRole(scope.role, AUTHORS);
    const existing = await feedRepository.findActivity(id);
    if (!existing) throw new NotFoundError("Post not found");
    if (scope.role === ROLES.TEACHER && existing.authorStaffId !== scope.staffId) {
      throw new ForbiddenError("You can only edit your own posts");
    }
    const { studentIds, media, ...rest } = input;
    // Editing is the same moment as creating, from the child's point of view:
    // adding a photograph to an existing post, or adding a child to a post that
    // already has photographs, both put a face in front of other parents.
    const willHaveMedia = media ? media.length > 0 : existingMediaCount(existing) > 0;
    const willName = studentIds ?? existing.taggedStudents.map((t) => t.studentId);
    if (willHaveMedia) await mediaService.assertPhotoConsent(willName);

    const row = await feedRepository.updateActivity(
      id,
      { ...rest, ...(media ? { media: media as Prisma.InputJsonValue } : {}) },
      studentIds,
    );
    return toActivity(row);
  },

  async remove(scope: Scope, id: string): Promise<void> {
    requireRole(scope.role, AUTHORS);
    const existing = await feedRepository.findActivity(id);
    if (!existing) throw new NotFoundError("Post not found");
    if (scope.role === ROLES.TEACHER && existing.authorStaffId !== scope.staffId) {
      throw new ForbiddenError("You can only delete your own posts");
    }
    await feedRepository.deleteActivity(id);
  },

  async comment(scope: Scope, activityId: string, body: string): Promise<Activity> {
    // Reading it first also enforces "a parent may only comment on a post they
    // are allowed to see".
    await this.get(scope, activityId);
    await feedRepository.addComment({
      activityId,
      authorId: scope.userId,
      authorName: scope.name,
      authorRole: scope.role === ROLES.PARENT ? "PARENT" : "TEACHER",
      body,
    });
    return this.get(scope, activityId);
  },

  async react(scope: Scope, activityId: string): Promise<Activity> {
    await this.get(scope, activityId);
    await feedRepository.toggleReaction(activityId, scope.userId);
    return this.get(scope, activityId);
  },

  // ------------------------------------------------------------- notices
  noticeWhere(scope: Scope): Prisma.NoticeWhereInput {
    if (scope.role === ROLES.SUPER_ADMIN || scope.role === ROLES.ADMIN) {
      // Admins manage notices, so they see drafts too.
      return scope.branchId ? { OR: [{ branchId: scope.branchId }, { branchId: null }] } : {};
    }
    const audience = isParent(scope) ? "PARENTS" : "STAFF";
    return {
      publishedAt: { not: null },
      OR: [
        { audience: "ALL" },
        { audience },
        { audience: "CLASSROOM", classroomId: { in: scope.classroomIds } },
      ],
    };
  },

  async listNotices(scope: Scope): Promise<Notice[]> {
    return (await feedRepository.listNotices(this.noticeWhere(scope))).map(toNotice);
  },

  async getNotice(scope: Scope, id: string): Promise<Notice> {
    const rows = await feedRepository.listNotices({ AND: [{ id }, this.noticeWhere(scope)] }, 1);
    if (!rows[0]) throw new NotFoundError("Notice not found");
    return toNotice(rows[0]);
  },

  async createNotice(scope: Scope, input: CreateNoticeInput): Promise<Notice> {
    requireRole(scope.role, AUTHORS);
    // A teacher can address their own room; anything wider is an admin's call.
    if (scope.role === ROLES.TEACHER) {
      if (input.audience !== "CLASSROOM" || !input.classroomId || !scope.classroomIds.includes(input.classroomId)) {
        throw new ForbiddenError("Teachers can only post notices to their own classroom");
      }
    }
    const { attachments, publish, ...rest } = input;
    const row = await feedRepository.createNotice({
      ...rest,
      authorName: scope.name,
      branchId: rest.branchId ?? scope.branchId,
      attachments: attachments as Prisma.InputJsonValue,
      publishedAt: publish ? new Date() : null,
    });
    return toNotice(row);
  },

  async updateNotice(scope: Scope, id: string, input: UpdateNoticeInput): Promise<Notice> {
    requireRole(scope.role, AUTHORS);
    const { attachments, publish, ...rest } = input;
    const row = await feedRepository.updateNotice(id, {
      ...rest,
      ...(attachments ? { attachments: attachments as Prisma.InputJsonValue } : {}),
      ...(publish === undefined ? {} : { publishedAt: publish ? new Date() : null }),
    });
    return toNotice(row);
  },

  async removeNotice(scope: Scope, id: string): Promise<void> {
    requireRole(scope.role, [ROLES.SUPER_ADMIN, ROLES.ADMIN]);
    await feedRepository.deleteNotice(id);
  },

  async markNoticeRead(scope: Scope, id: string): Promise<Notice> {
    await this.getNotice(scope, id);
    await feedRepository.markNoticeRead(id, scope.userId);
    return this.getNotice(scope, id);
  },
};

/**
 * How many photographs a stored post already carries. `Activity.media` is a
 * JSON column, so it is whatever was last written there — defended rather than
 * trusted.
 */
function existingMediaCount(row: { media: unknown }): number {
  return Array.isArray(row.media) ? row.media.length : 0;
}
