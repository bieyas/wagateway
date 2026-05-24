import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation, ConversationStatus } from './entities/conversation.entity';
import { ConversationMessage, MessageRole } from './entities/conversation-message.entity';

export interface ChatSummary {
  phone: string;
  deviceId: string;
  contactName: string | null;
  isGroup: boolean;
  groupId: string | null;
  groupName: string | null;
  lastMessage: string | null;
  lastSenderName: string | null;
  lastMessageAt: Date | null;
  unreadCount: number;
  csUnreadCount: number;
  isAIActive: boolean;
  humanTakeover: boolean;
  hasAIHistory: boolean;
  avatarUrl: string | null;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  senderName: string | null;
  type: string;
  mediaUrl: string | null;
  model: string | null;
  createdAt: Date;
  source: 'ai';
}

@Injectable()
export class ChatsService {
  constructor(
    @InjectRepository(Conversation)
    private readonly convRepo: Repository<Conversation>,
    @InjectRepository(ConversationMessage)
    private readonly msgRepo: Repository<ConversationMessage>,
  ) {}

  /**
   * Get all chat summaries for a device based on AI conversations
   */
  async getChatSummaries(deviceId: string): Promise<ChatSummary[]> {
    // Single query: fetch conversations + latest message per conversation via subquery
    const rows = await this.convRepo
      .createQueryBuilder('conv')
      .leftJoinAndMapOne(
        'conv.latestMsg',
        ConversationMessage,
        'msg',
        'msg.id = (SELECT m2.id FROM conversation_messages m2 WHERE m2."conversationId" = conv.id ORDER BY m2."createdAt" DESC LIMIT 1)',
      )
      .where('conv.deviceId = :deviceId', { deviceId })
      .orderBy('conv.lastMessageAt', 'DESC')
      .getMany();

    return rows.map((conv) => {
      const latestMsg = (conv as any).latestMsg as ConversationMessage | undefined;
      return {
        phone: conv.phone,
        deviceId: conv.deviceId,
        contactName: conv.contactName || null,
        isGroup: conv.isGroup || false,
        groupId: conv.groupId || null,
        groupName: conv.groupName || null,
        lastMessage: latestMsg?.content || null,
        lastSenderName: latestMsg?.senderName || null,
        lastMessageAt: conv.lastMessageAt || null,
        unreadCount: conv.csUnreadCount || 0,
        csUnreadCount: conv.csUnreadCount || 0,
        isAIActive: conv.status === ConversationStatus.ACTIVE,
        humanTakeover: conv.status === ConversationStatus.HUMAN_TAKEOVER || conv.status === ConversationStatus.ESCALATED,
        hasAIHistory: true,
        avatarUrl: conv.avatarUrl || null,
      };
    });
  }

  /**
   * Get chat history for a phone number from conversation_messages
   */
  async getChatHistory(deviceId: string, phone: string): Promise<{
    summary: ChatSummary;
    messages: ChatMessage[];
  }> {
    const conv = await this.convRepo.findOne({ where: { deviceId, phone } });

    const messages: ChatMessage[] = [];

    if (conv) {
      const convMessages = await this.msgRepo.find({
        where: { conversationId: conv.id },
        order: { createdAt: 'ASC' },
      });

      messages.push(...convMessages.map(m => ({
        id: m.id,
        role: (m.role === MessageRole.USER ? 'user' : 'assistant') as 'user' | 'assistant',
        content: m.content,
        senderName: m.senderName || null,
        type: m.messageType || 'text',
        mediaUrl: m.mediaUrl || null,
        model: m.model || null,
        createdAt: m.createdAt,
        source: 'ai' as const,
      })));
    }

    const latestMsg = messages[messages.length - 1];

    const summary: ChatSummary = {
      phone,
      deviceId: conv?.deviceId || deviceId,
      contactName: conv?.contactName || null,
      isGroup: conv?.isGroup || false,
      groupId: conv?.groupId || null,
      groupName: conv?.groupName || null,
      lastMessage: latestMsg?.content || null,
      lastSenderName: null,
      lastMessageAt: conv?.lastMessageAt || null,
      unreadCount: conv?.csUnreadCount || 0,
      csUnreadCount: conv?.csUnreadCount || 0,
      isAIActive: conv?.status === ConversationStatus.ACTIVE || false,
      humanTakeover: conv?.status === ConversationStatus.HUMAN_TAKEOVER || conv?.status === ConversationStatus.ESCALATED || false,
      hasAIHistory: !!conv,
      avatarUrl: conv?.avatarUrl || null,
    };

    return { summary, messages };
  }
}
