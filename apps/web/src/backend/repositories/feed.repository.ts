import { prisma, type Prisma } from "@/backend/database/client";

export const activityInclude = {
  author: { select: { name: true } },
  taggedStudents: { select: { studentId: true } },
  comments: { orderBy: { createdAt: "asc" } },
  reactions: { select: { userId: true } },
} satisfies Prisma.ActivityInclude;

export const noticeInclude = {
  reads: { select: { userId: true } },
} satisfies Prisma.NoticeInclude;

export const feedRepository = {
  listActivities(where: Prisma.ActivityWhereInput, take = 100) {
    return prisma.activity.findMany({
      where,
      include: activityInclude,
      orderBy: { createdAt: "desc" },
      take,
    });
  },

  findActivity(id: string) {
    return prisma.activity.findUnique({ where: { id }, include: activityInclude });
  },

  async createActivity(data: Prisma.ActivityUncheckedCreateInput, studentIds: string[]) {
    const activity = await prisma.activity.create({ data });
    if (studentIds.length) {
      await prisma.activityTag.createMany({
        data: studentIds.map((studentId) => ({ activityId: activity.id, studentId })),
        skipDuplicates: true,
      });
    }
    return prisma.activity.findUniqueOrThrow({
      where: { id: activity.id },
      include: activityInclude,
    });
  },

  async updateActivity(
    id: string,
    data: Prisma.ActivityUncheckedUpdateInput,
    studentIds?: string[],
  ) {
    if (studentIds) {
      await prisma.$transaction([
        prisma.activityTag.deleteMany({ where: { activityId: id } }),
        prisma.activityTag.createMany({
          data: studentIds.map((studentId) => ({ activityId: id, studentId })),
          skipDuplicates: true,
        }),
      ]);
    }
    return prisma.activity.update({ where: { id }, data, include: activityInclude });
  },

  deleteActivity(id: string) {
    return prisma.activity.delete({ where: { id } });
  },

  addComment(data: Prisma.ActivityCommentUncheckedCreateInput) {
    return prisma.activityComment.create({ data });
  },

  async toggleReaction(activityId: string, userId: string): Promise<boolean> {
    const existing = await prisma.activityReaction.findUnique({
      where: { activityId_userId: { activityId, userId } },
    });
    if (existing) {
      await prisma.activityReaction.delete({ where: { activityId_userId: { activityId, userId } } });
      return false;
    }
    await prisma.activityReaction.create({ data: { activityId, userId } });
    return true;
  },

  // ------------------------------------------------------------- notices
  listNotices(where: Prisma.NoticeWhereInput, take = 200) {
    return prisma.notice.findMany({
      where,
      include: noticeInclude,
      orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
      take,
    });
  },

  findNotice(id: string) {
    return prisma.notice.findUnique({ where: { id }, include: noticeInclude });
  },

  createNotice(data: Prisma.NoticeUncheckedCreateInput) {
    return prisma.notice.create({ data, include: noticeInclude });
  },

  updateNotice(id: string, data: Prisma.NoticeUncheckedUpdateInput) {
    return prisma.notice.update({ where: { id }, data, include: noticeInclude });
  },

  deleteNotice(id: string) {
    return prisma.notice.delete({ where: { id } });
  },

  markNoticeRead(noticeId: string, userId: string) {
    return prisma.noticeRead.upsert({
      where: { noticeId_userId: { noticeId, userId } },
      update: {},
      create: { noticeId, userId },
    });
  },
};
