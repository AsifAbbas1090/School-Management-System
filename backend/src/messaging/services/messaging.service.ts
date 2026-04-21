import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Chat-style messaging service. Every query uses `select` (never bare
 * `include`) so we only transfer the columns the UI actually renders,
 * and every listing is pagination-aware.
 */
@Injectable()
export class MessagingService {
  constructor(private prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────
  // Conversations
  // ─────────────────────────────────────────────────────────────

  /**
   * Return the one conversation shared by these two users in this school,
   * creating it the first time. Two-step lookup: find conversation-ids
   * where userA is a participant, then intersect with userB — this uses
   * the `(conversationId, userId)` unique index and is index-only.
   */
  async getOrCreateConversation(userAId: string, userBId: string, schoolId: string) {
    if (userAId === userBId) {
      throw new BadRequestException('Cannot start a conversation with yourself');
    }

    // Verify the other user exists in the same school and is not soft-deleted.
    const other = await this.prisma.user.findFirst({
      where: { id: userBId, schoolId, deletedAt: null },
      select: { id: true, name: true, role: true },
    });
    if (!other) {
      throw new NotFoundException('Recipient not found in this school');
    }

    // Step 1: conversation-ids where userA participates.
    const aParts = await this.prisma.conversationParticipant.findMany({
      where: { userId: userAId, Conversation: { schoolId } },
      select: { conversationId: true },
    });
    const aIds = aParts.map((p) => p.conversationId);

    // Step 2: any conversation in that set where userB also participates.
    let existing: { id: string } | null = null;
    if (aIds.length > 0) {
      existing = await this.prisma.conversation.findFirst({
        where: {
          id: { in: aIds },
          schoolId,
          participants: { some: { userId: userBId } },
        },
        select: { id: true },
      });
    }

    const conversationId = existing?.id ?? randomUUID();

    if (!existing) {
      await this.prisma.conversation.create({
        data: {
          id: conversationId,
          schoolId,
          participants: {
            create: [
              { id: randomUUID(), userId: userAId },
              { id: randomUUID(), userId: userBId },
            ],
          },
        },
        select: { id: true },
      });
    }

    return this.getConversationPreview(conversationId, userAId);
  }

  /** One conversation row shaped the way the UI expects. Reused after create. */
  private async getConversationPreview(conversationId: string, currentUserId: string) {
    const conv = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: {
        id: true,
        updatedAt: true,
        participants: {
          select: {
            userId: true,
            lastReadAt: true,
            User: { select: { id: true, name: true, role: true } },
          },
        },
        messages: {
          orderBy: { sentAt: 'desc' },
          take: 1,
          select: { content: true, sentAt: true, senderId: true, isDeleted: true },
        },
      },
    });
    if (!conv) throw new NotFoundException('Conversation not found');

    return this.shapeConversation(conv, currentUserId);
  }

  /**
   * List of conversations for the sidebar chat list.
   * Ordered by Conversation.updatedAt (which is bumped on every sendMessage)
   * so an O(log n) index range scan returns the top N threads.
   */
  async getMyConversations(userId: string, schoolId: string) {
    const rows = await this.prisma.conversation.findMany({
      where: { schoolId, participants: { some: { userId } } },
      orderBy: { updatedAt: 'desc' },
      take: 100,
      select: {
        id: true,
        updatedAt: true,
        participants: {
          select: {
            userId: true,
            lastReadAt: true,
            User: { select: { id: true, name: true, role: true } },
          },
        },
        messages: {
          orderBy: { sentAt: 'desc' },
          take: 1,
          select: { content: true, sentAt: true, senderId: true, isDeleted: true },
        },
      },
    });

    const shaped = await Promise.all(
      rows.map(async (c) => {
        const base = this.shapeConversation(c, userId);
        base.unreadCount = await this.unreadInConversation(c.id, userId);
        return base;
      }),
    );
    return shaped;
  }

  /**
   * Count unread messages in one conversation for one user.
   * Uses the `(conversationId, sentAt)` message index + the participant unique key.
   */
  private async unreadInConversation(conversationId: string, userId: string): Promise<number> {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
      select: { lastReadAt: true },
    });
    return this.prisma.message.count({
      where: {
        conversationId,
        senderId: { not: userId },
        isDeleted: false,
        ...(participant?.lastReadAt ? { sentAt: { gt: participant.lastReadAt } } : {}),
      },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Messages
  // ─────────────────────────────────────────────────────────────

  /**
   * Page back through a conversation, newest-first. The caller must be
   * a participant; otherwise we 403. Marking-as-read happens in the
   * background so it never delays the response.
   */
  async getMessages(
    conversationId: string,
    userId: string,
    schoolId: string,
    page = 1,
    limit = 40,
  ) {
    await this.assertParticipant(conversationId, userId, schoolId);

    const where = { conversationId };
    const [total, messages] = await Promise.all([
      this.prisma.message.count({ where }),
      this.prisma.message.findMany({
        where,
        orderBy: { sentAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          content: true,
          sentAt: true,
          isDeleted: true,
          senderId: true,
          User_Message_senderIdToUser: { select: { id: true, name: true } },
        },
      }),
    ]);

    // Fire-and-forget: advance this user's lastReadAt. Errors are swallowed —
    // a failed read-receipt must never break the request.
    void this.prisma.conversationParticipant
      .update({
        where: { conversationId_userId: { conversationId, userId } },
        data: { lastReadAt: new Date() },
      })
      .catch(() => undefined);

    return {
      data: messages.map((m) => ({
        id: m.id,
        content: m.isDeleted ? null : m.content,
        sentAt: m.sentAt,
        isDeleted: m.isDeleted,
        senderId: m.senderId,
        sender: m.User_Message_senderIdToUser,
      })),
      total,
      page,
      limit,
      hasMore: total > page * limit,
    };
  }

  /** Insert one message and bump the conversation's updatedAt so it floats to the top. */
  async sendMessage(
    conversationId: string,
    senderId: string,
    schoolId: string,
    content: string,
  ) {
    await this.assertParticipant(conversationId, senderId, schoolId);

    const trimmed = (content ?? '').trim();
    if (!trimmed) {
      throw new BadRequestException('Message cannot be empty');
    }

    const now = new Date();
    const message = await this.prisma.message.create({
      data: {
        id: randomUUID(),
        conversationId,
        schoolId,
        senderId,
        content: trimmed,
        sentAt: now,
        updatedAt: now,
        // Legacy non-null-enforced fields on this table: leave null now that
        // they're optional in the schema.
      },
      select: {
        id: true,
        content: true,
        sentAt: true,
        isDeleted: true,
        senderId: true,
        User_Message_senderIdToUser: { select: { id: true, name: true } },
      },
    });

    // Sender's own lastReadAt = now (you've read what you just sent), and the
    // conversation row's updatedAt must rise to the top of the sidebar list.
    void this.prisma.$transaction([
      this.prisma.conversationParticipant.update({
        where: { conversationId_userId: { conversationId, userId: senderId } },
        data: { lastReadAt: now },
      }),
      this.prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: now },
      }),
    ]).catch(() => undefined);

    return {
      id: message.id,
      content: message.content,
      sentAt: message.sentAt,
      isDeleted: message.isDeleted,
      senderId: message.senderId,
      sender: message.User_Message_senderIdToUser,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Unread count (sidebar badge) + user search (compose modal)
  // ─────────────────────────────────────────────────────────────

  /**
   * Total unread count across every conversation for the sidebar badge.
   * Per-conversation lastReadAt means we have to iterate the user's
   * participant rows, but the count-per-conversation is served by the
   * `(conversationId, sentAt)` index so each one is cheap.
   */
  async getUnreadCount(userId: string, schoolId: string): Promise<{ count: number }> {
    const parts = await this.prisma.conversationParticipant.findMany({
      where: { userId, Conversation: { schoolId } },
      select: { conversationId: true, lastReadAt: true },
    });
    if (parts.length === 0) return { count: 0 };

    const counts = await Promise.all(
      parts.map((p) =>
        this.prisma.message.count({
          where: {
            conversationId: p.conversationId,
            senderId: { not: userId },
            isDeleted: false,
            ...(p.lastReadAt ? { sentAt: { gt: p.lastReadAt } } : {}),
          },
        }),
      ),
    );

    return { count: counts.reduce((a, b) => a + b, 0) };
  }

  /** Compose-modal search: find up to 10 users in this school by name. */
  async searchUsers(schoolId: string, currentUserId: string, query: string) {
    const q = (query ?? '').trim();
    const users = await this.prisma.user.findMany({
      where: {
        schoolId,
        deletedAt: null,
        id: { not: currentUserId },
        ...(q ? { name: { contains: q, mode: 'insensitive' as const } } : {}),
      },
      select: { id: true, name: true, role: true },
      orderBy: { name: 'asc' },
      take: 10,
    });
    return users;
  }

  // ─────────────────────────────────────────────────────────────
  // helpers
  // ─────────────────────────────────────────────────────────────

  /** Throw 403 unless userId is a participant of this conversation in this school. */
  private async assertParticipant(
    conversationId: string,
    userId: string,
    schoolId: string,
  ) {
    const participant = await this.prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId,
        Conversation: { schoolId },
      },
      select: { id: true },
    });
    if (!participant) {
      throw new ForbiddenException('You are not a participant of this conversation');
    }
  }

  /** Flatten a raw conversation row into the shape the chat UI consumes. */
  private shapeConversation(
    conv: {
      id: string;
      updatedAt: Date;
      participants: Array<{
        userId: string;
        lastReadAt: Date | null;
        User: { id: string; name: string; role: string } | null;
      }>;
      messages: Array<{
        content: string | null;
        sentAt: Date;
        senderId: string;
        isDeleted: boolean;
      }>;
    },
    currentUserId: string,
  ) {
    const other =
      conv.participants.find((p) => p.userId !== currentUserId)?.User ?? null;
    const last = conv.messages[0] ?? null;

    return {
      id: conv.id,
      updatedAt: conv.updatedAt,
      otherUser: other,
      lastMessage: last
        ? {
            content: last.isDeleted ? null : last.content,
            sentAt: last.sentAt,
            senderId: last.senderId,
            isDeleted: last.isDeleted,
            isOwn: last.senderId === currentUserId,
          }
        : null,
      unreadCount: 0, // filled in by caller via unreadInConversation for list endpoints
    };
  }
}
