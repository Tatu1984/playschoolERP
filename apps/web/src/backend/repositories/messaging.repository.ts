import { prisma, type Prisma } from "@/backend/database/client";

export const conversationInclude = {
  members: { select: { userId: true } },
} satisfies Prisma.ConversationInclude;

export const messagingRepository = {
  listConversations(where: Prisma.ConversationWhereInput) {
    return prisma.conversation.findMany({
      where,
      include: conversationInclude,
      orderBy: { lastMessageAt: "desc" },
    });
  },

  findConversation(id: string) {
    return prisma.conversation.findUnique({ where: { id }, include: conversationInclude });
  },

  updateConversation(id: string, data: Prisma.ConversationUncheckedUpdateInput) {
    return prisma.conversation.update({ where: { id }, data, include: conversationInclude });
  },

  listMessages(conversationId: string) {
    return prisma.message.findMany({ where: { conversationId }, orderBy: { createdAt: "asc" } });
  },

  listMeetings(where: Prisma.MeetingWhereInput) {
    return prisma.meeting.findMany({ where, orderBy: { scheduledFor: "desc" } });
  },

  findMeeting(id: string) {
    return prisma.meeting.findUnique({ where: { id } });
  },

  createMeeting(data: Prisma.MeetingUncheckedCreateInput) {
    return prisma.meeting.create({ data });
  },

  updateMeeting(id: string, data: Prisma.MeetingUncheckedUpdateInput) {
    return prisma.meeting.update({ where: { id }, data });
  },
};
