/**
 * Parent–teacher messaging and meeting requests (SoW §7.9).
 *
 * Membership is the access rule: you can read a thread if you are in it, and
 * that is checked on every call rather than trusted from the client. The unread
 * counters are kept on the conversation because both portals show a badge
 * before they show a thread, and counting messages per open would be a query
 * per row in a list.
 */
import { prisma, type Prisma } from "@/backend/database/client";
import { messagingRepository } from "@/backend/repositories/messaging.repository";
import { toConversation, toMeeting, toMessage } from "@/backend/mappers";
import { ForbiddenError, NotFoundError } from "@/backend/utils/error-handler.util";
import { canSeeStudent, type Scope } from "@/backend/utils/scope.util";
import { ROLES } from "@/shared/constants/roles";
import type { Conversation, Meeting, Message } from "@/shared/types/engagement.types";
import type {
  CreateMeetingInput,
  SendMessageInput,
  StartConversationInput,
} from "@/backend/validators/messaging.validator";

const previewOf = (m: { kind: string; body: string }) =>
  m.kind === "VOICE" ? "🎤 Voice note" : m.kind === "FILE" ? "📎 Attachment" : m.body.slice(0, 140);

export const messagingService = {
  async listConversations(scope: Scope): Promise<Conversation[]> {
    const where: Prisma.ConversationWhereInput =
      scope.role === ROLES.SUPER_ADMIN || scope.role === ROLES.ADMIN
        ? { OR: [{ members: { some: { userId: scope.userId } } }, { student: { branchId: scope.branchId ?? undefined } }] }
        : { members: { some: { userId: scope.userId } } };
    return (await messagingRepository.listConversations(where)).map(toConversation);
  },

  async assertMember(scope: Scope, conversationId: string) {
    const conv = await messagingRepository.findConversation(conversationId);
    if (!conv) throw new NotFoundError("Conversation not found");
    const member = conv.members.some((m) => m.userId === scope.userId);
    // An admin can look into a thread in their own branch — safeguarding means
    // someone has to be able to. A teacher or parent must be in it.
    const adminOverride = scope.role === ROLES.SUPER_ADMIN || scope.role === ROLES.ADMIN;
    if (!member && !adminOverride) throw new ForbiddenError();
    return conv;
  },

  async listMessages(scope: Scope, conversationId: string): Promise<Message[]> {
    await this.assertMember(scope, conversationId);
    return (await messagingRepository.listMessages(conversationId)).map(toMessage);
  },

  async send(scope: Scope, conversationId: string, input: SendMessageInput): Promise<Message> {
    await this.assertMember(scope, conversationId);
    const senderRole = scope.role === ROLES.PARENT ? "PARENT" : scope.role === ROLES.TEACHER ? "TEACHER" : "ADMIN";

    const message = await prisma.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: {
          conversationId,
          senderId: scope.userId,
          senderName: scope.name,
          senderRole,
          kind: input.kind,
          body: input.body,
          durationSec: input.durationSec ?? null,
          attachment: input.attachment as Prisma.InputJsonValue | undefined,
        },
      });
      // The unread badge belongs to whoever did NOT just type.
      await tx.conversation.update({
        where: { id: conversationId },
        data: {
          lastMessageAt: created.createdAt,
          lastMessagePreview: previewOf(created),
          ...(senderRole === "PARENT"
            ? { unreadForTeacher: { increment: 1 } }
            : { unreadForParent: { increment: 1 } }),
        },
      });
      return created;
    });

    return toMessage(message);
  },

  async start(scope: Scope, input: StartConversationInput): Promise<{ conversation: Conversation; message: Message }> {
    if (!(await canSeeStudent(scope, input.studentId))) throw new ForbiddenError();
    const senderRole = scope.role === ROLES.PARENT ? "PARENT" : scope.role === ROLES.TEACHER ? "TEACHER" : "ADMIN";
    const participants = [...new Set([scope.userId, ...input.participantIds])];

    const { conversation, message } = await prisma.$transaction(async (tx) => {
      const conv = await tx.conversation.create({
        data: {
          studentId: input.studentId,
          parentName: input.parentName,
          teacherName: input.teacherName,
          subject: input.subject,
          lastMessagePreview: input.firstMessage.slice(0, 140),
          unreadForParent: senderRole === "PARENT" ? 0 : 1,
          unreadForTeacher: senderRole === "PARENT" ? 1 : 0,
          members: { create: participants.map((userId) => ({ userId })) },
        },
        include: { members: { select: { userId: true } } },
      });
      const msg = await tx.message.create({
        data: {
          conversationId: conv.id,
          senderId: scope.userId,
          senderName: scope.name,
          senderRole,
          kind: "TEXT",
          body: input.firstMessage,
        },
      });
      return { conversation: conv, message: msg };
    });

    return { conversation: toConversation(conversation), message: toMessage(message) };
  },

  /** Clear this side's badge and stamp the messages the other side sent. */
  async markRead(scope: Scope, conversationId: string): Promise<Conversation> {
    await this.assertMember(scope, conversationId);
    const side = scope.role === ROLES.PARENT ? "parent" : "teacher";
    const row = await prisma.$transaction(async (tx) => {
      await tx.message.updateMany({
        where: { conversationId, readAt: null, senderId: { not: scope.userId } },
        data: { readAt: new Date() },
      });
      return tx.conversation.update({
        where: { id: conversationId },
        data: side === "parent" ? { unreadForParent: 0 } : { unreadForTeacher: 0 },
        include: { members: { select: { userId: true } } },
      });
    });
    return toConversation(row);
  },

  async setArchived(scope: Scope, conversationId: string, archived: boolean): Promise<Conversation> {
    await this.assertMember(scope, conversationId);
    return toConversation(await messagingRepository.updateConversation(conversationId, { archived }));
  },

  // ------------------------------------------------------------ meetings
  async listMeetings(scope: Scope): Promise<Meeting[]> {
    const where: Prisma.MeetingWhereInput =
      scope.role === ROLES.PARENT
        ? { studentId: { in: scope.studentIds } }
        : scope.role === ROLES.TEACHER
          ? { student: { classroomId: { in: scope.classroomIds } } }
          : scope.branchId
            ? { student: { branchId: scope.branchId } }
            : {};
    return (await messagingRepository.listMeetings(where)).map(toMeeting);
  },

  async requestMeeting(scope: Scope, input: CreateMeetingInput): Promise<Meeting> {
    if (!(await canSeeStudent(scope, input.studentId))) throw new ForbiddenError();
    const row = await messagingRepository.createMeeting({
      ...input,
      scheduledFor: new Date(input.scheduledFor),
      // A parent asks; staff confirm. Staff booking one is already agreed.
      status: scope.role === ROLES.PARENT ? "REQUESTED" : "CONFIRMED",
    });
    return toMeeting(row);
  },

  async setMeetingStatus(scope: Scope, id: string, status: Meeting["status"]): Promise<Meeting> {
    const existing = await messagingRepository.findMeeting(id);
    if (!existing) throw new NotFoundError("Meeting not found");
    if (!(await canSeeStudent(scope, existing.studentId))) throw new ForbiddenError();
    // A parent may withdraw their own request; only staff confirm or decline.
    if (scope.role === ROLES.PARENT && status !== "DECLINED") {
      throw new ForbiddenError("Only the school can confirm a meeting");
    }
    return toMeeting(await messagingRepository.updateMeeting(id, { status }));
  },
};
