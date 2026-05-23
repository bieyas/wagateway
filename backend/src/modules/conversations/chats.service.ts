import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation, ConversationStatus } from './entities/conversation.entity';
import { ConversationMessage, MessageRole } from './entities/conversation-message.entity';

export interface ChatSummary {
  phone: string;
  contactName: string | null;
  lastMessage: string | null;
  lastMessageAt: Date | null;
  unreadCount: number;
  isAIActive: boolean;
  humanTakeover: boolean;
  hasAIHistory: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
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
    const conversations = await this.convRepo.find({
      where: { deviceId },
      order: { lastMessageAt: 'DESC' },
    });

    const summaries: ChatSummary[] = await Promise.all(
      conversations.map(async (conv) => {
        const latestMsg = await this.msgRepo.findOne({
          where: { conversationId: conv.id },
          order: { createdAt: 'DESC' },
        });

        return {
          phone: conv.phone,
          contactName: conv.contactName || null,
          lastMessage: latestMsg?.content || null,
          lastMessageAt: conv.lastMessageAt || null,
          unreadCount: 0,
          isAIActive: conv.status === ConversationStatus.ACTIVE,
          humanTakeover: conv.status === ConversationStatus.HUMAN_TAKEOVER || conv.status === ConversationStatus.ESCALATED,
          hasAIHistory: true,
        };
      }),
    );

    return summaries;
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
      contactName: conv?.contactName || null,
      lastMessage: latestMsg?.content || null,
      lastMessageAt: conv?.lastMessageAt || null,
      unreadCount: 0,
      isAIActive: conv?.status === ConversationStatus.ACTIVE || false,
      humanTakeover: conv?.status === ConversationStatus.HUMAN_TAKEOVER || conv?.status === ConversationStatus.ESCALATED || false,
      hasAIHistory: !!conv,
    };

    return { summary, messages };
  }
}
