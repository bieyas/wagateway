import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation, ConversationStatus } from './entities/conversation.entity';
import { ConversationMessage, MessageRole } from './entities/conversation-message.entity';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectRepository(Conversation)
    private readonly convRepo: Repository<Conversation>,
    @InjectRepository(ConversationMessage)
    private readonly msgRepo: Repository<ConversationMessage>,
  ) {}

  async findOrCreate(deviceId: string, phone: string, contactName?: string): Promise<Conversation> {
    let conv = await this.convRepo.findOne({ where: { deviceId, phone } });
    if (!conv) {
      conv = await this.convRepo.save(
        this.convRepo.create({
          deviceId,
          phone,
          contactName: contactName || phone,
          status: ConversationStatus.ACTIVE,
          lastMessageAt: new Date(),
        }),
      );
    } else if (contactName && (!conv.contactName || conv.contactName === conv.phone)) {
      await this.convRepo.update(conv.id, { contactName });
      conv.contactName = contactName;
    }
    return conv;
  }

  async addMessage(
    conversationId: string,
    role: MessageRole,
    content: string,
    tokenCount = 0,
    model?: string,
    mediaUrl?: string,
    messageType?: string,
  ): Promise<ConversationMessage> {
    const msg = await this.msgRepo.save(
      this.msgRepo.create({ conversationId, role, content, tokenCount, model, mediaUrl, messageType: messageType || 'text' }),
    );
    await this.convRepo.update(conversationId, {
      lastMessageAt: new Date(),
      messageCount: () => '"messageCount" + 1',
      totalTokensUsed: () => `"totalTokensUsed" + ${tokenCount}`,
    });
    return msg;
  }

  async getRecentMessages(conversationId: string, limit = 20): Promise<ConversationMessage[]> {
    return this.msgRepo.find({
      where: { conversationId },
      order: { createdAt: 'DESC' },
      take: limit,
    }).then((msgs) => msgs.reverse());
  }

  async getConversation(deviceId: string, phone: string): Promise<Conversation> {
    const conv = await this.convRepo.findOne({ where: { deviceId, phone } });
    if (!conv) throw new NotFoundException(`No conversation found for ${phone}`);
    return conv;
  }

  async listConversations(deviceId: string): Promise<Conversation[]> {
    return this.convRepo.find({
      where: { deviceId },
      order: { lastMessageAt: 'DESC' },
    });
  }

  async resetConversation(deviceId: string, phone: string): Promise<void> {
    const conv = await this.convRepo.findOne({ where: { deviceId, phone } });
    if (conv) {
      await this.msgRepo.delete({ conversationId: conv.id });
      await this.convRepo.update(conv.id, {
        status: ConversationStatus.ACTIVE,
        messageCount: 0,
        totalTokensUsed: 0,
        summary: '',
        lastMessageAt: new Date(),
      });
    }
  }

  async closeConversation(deviceId: string, phone: string): Promise<void> {
    await this.convRepo.update({ deviceId, phone }, { status: ConversationStatus.CLOSED });
  }

  async escalate(deviceId: string, phone: string): Promise<void> {
    await this.convRepo.update({ deviceId, phone }, { status: ConversationStatus.ESCALATED });
  }

  async setHumanTakeover(deviceId: string, phone: string): Promise<void> {
    await this.convRepo.update({ deviceId, phone }, { status: ConversationStatus.HUMAN_TAKEOVER });
  }

  async releaseToAI(deviceId: string, phone: string): Promise<void> {
    await this.convRepo.update({ deviceId, phone }, { status: ConversationStatus.ACTIVE });
  }

  async isHumanTakeover(deviceId: string, phone: string): Promise<boolean> {
    const conv = await this.convRepo.findOne({ where: { deviceId, phone } });
    return conv?.status === ConversationStatus.HUMAN_TAKEOVER || conv?.status === ConversationStatus.ESCALATED;
  }
}
