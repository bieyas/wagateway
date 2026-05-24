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

  async findOrCreate(
    deviceId: string,
    phone: string,
    contactName?: string,
    options?: { isGroup?: boolean; groupId?: string; groupName?: string },
  ): Promise<Conversation> {
    let conv = await this.convRepo.findOne({ where: { deviceId, phone } });
    if (!conv) {
      conv = await this.convRepo.save(
        this.convRepo.create({
          deviceId,
          phone,
          contactName: contactName || options?.groupName || phone,
          isGroup: options?.isGroup ?? false,
          groupId: options?.groupId ?? (options?.isGroup ? phone : null),
          groupName: options?.groupName ?? null,
          status: ConversationStatus.ACTIVE,
          lastMessageAt: new Date(),
        }),
      );
    } else {
      const patch: Partial<Conversation> = {};
      if (options?.isGroup) {
        // For groups: always sync contactName with groupName to fix stale entries
        if (options.groupName && conv.contactName !== options.groupName) patch.contactName = options.groupName;
      } else {
        if (contactName && (!conv.contactName || conv.contactName === conv.phone)) patch.contactName = contactName;
      }
      if (options?.isGroup !== undefined && conv.isGroup !== options.isGroup) patch.isGroup = options.isGroup;
      if (options?.groupId && conv.groupId !== options.groupId) patch.groupId = options.groupId;
      if (options?.groupName && conv.groupName !== options.groupName) patch.groupName = options.groupName;
      if (Object.keys(patch).length) {
        await this.convRepo.update(conv.id, patch);
        Object.assign(conv, patch);
      }
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
    senderName?: string,
  ): Promise<ConversationMessage> {
    const msg = await this.msgRepo.save(
      this.msgRepo.create({ conversationId, role, content, tokenCount, model, mediaUrl, messageType: messageType || 'text', senderName: senderName || null }),
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

  async refreshAvatar(deviceId: string, phone: string, whatsappService: any): Promise<string | null> {
    const url = await whatsappService.getProfilePicUrl(deviceId, phone).catch(() => null);
    if (url) await this.convRepo.update({ deviceId, phone }, { avatarUrl: url });
    return url || null;
  }

  async deleteConversation(deviceId: string, phone: string): Promise<void> {
    const conv = await this.convRepo.findOne({ where: { deviceId, phone } });
    if (conv) {
      await this.msgRepo.delete({ conversationId: conv.id });
      await this.convRepo.remove(conv);
    }
  }

  async escalate(deviceId: string, phone: string): Promise<void> {
    await this.convRepo.update({ deviceId, phone }, {
      status: ConversationStatus.ESCALATED,
      escalatedAt: new Date(),
    });
  }

  async setHumanTakeoverWithTimestamp(deviceId: string, phone: string): Promise<void> {
    await this.convRepo.update({ deviceId, phone }, {
      status: ConversationStatus.HUMAN_TAKEOVER,
      escalatedAt: new Date(),
    });
  }

  async findEscalatedTimedOut(deviceId: string, timeoutMinutes: number): Promise<Conversation[]> {
    if (!timeoutMinutes) return [];
    const cutoff = new Date(Date.now() - timeoutMinutes * 60 * 1000);
    return this.convRepo
      .createQueryBuilder('c')
      .where('c."deviceId" = :deviceId', { deviceId })
      .andWhere('c.status IN (:...statuses)', { statuses: [ConversationStatus.ESCALATED, ConversationStatus.HUMAN_TAKEOVER] })
      .andWhere('c."escalatedAt" IS NOT NULL')
      .andWhere('c."lastMessageAt" < :cutoff', { cutoff })
      .getMany();
  }

  async setHumanTakeover(deviceId: string, phone: string): Promise<void> {
    await this.convRepo.update({ deviceId, phone }, { status: ConversationStatus.HUMAN_TAKEOVER });
  }

  async releaseToAI(deviceId: string, phone: string): Promise<void> {
    await this.convRepo.update({ deviceId, phone }, { status: ConversationStatus.ACTIVE });
  }

  async incrementUnread(deviceId: string, phone: string): Promise<void> {
    await this.convRepo
      .createQueryBuilder()
      .update()
      .set({ csUnreadCount: () => '"csUnreadCount" + 1' })
      .where('"deviceId" = :deviceId AND phone = :phone', { deviceId, phone })
      .execute();
  }

  async markCsRead(deviceId: string, phone: string): Promise<void> {
    await this.convRepo.update({ deviceId, phone }, { csUnreadCount: 0 });
  }

  async getTotalUnread(deviceIds: string[]): Promise<{ total: number; byConversation: { id: string; phone: string; contactName: string; deviceId: string; csUnreadCount: number; isGroup: boolean; groupName: string | null }[] }> {
    if (!deviceIds.length) return { total: 0, byConversation: [] };
    const rows = await this.convRepo
      .createQueryBuilder('c')
      .where('c."deviceId" IN (:...deviceIds)', { deviceIds })
      .andWhere('c."csUnreadCount" > 0')
      .orderBy('c."lastMessageAt"', 'DESC')
      .select(['c.id', 'c.phone', 'c.contactName', 'c.deviceId', 'c.csUnreadCount', 'c.lastMessageAt', 'c.isGroup', 'c.groupName'])
      .getMany();
    const total = rows.reduce((sum, r) => sum + (r.csUnreadCount || 0), 0);
    return {
      total,
      byConversation: rows.map(r => ({
        id: r.id,
        phone: r.phone,
        contactName: r.contactName,
        deviceId: r.deviceId,
        csUnreadCount: r.csUnreadCount,
        isGroup: r.isGroup,
        groupName: r.groupName,
      })),
    };
  }

  async isHumanTakeover(deviceId: string, phone: string): Promise<boolean> {
    const conv = await this.convRepo.findOne({ where: { deviceId, phone } });
    return conv?.status === ConversationStatus.HUMAN_TAKEOVER || conv?.status === ConversationStatus.ESCALATED;
  }
}
