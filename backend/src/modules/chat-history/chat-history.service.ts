import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { ChatHistory, ChatType, MessageDirection } from './entities/chat-history.entity';
import { WASocket, proto } from '@whiskeysockets/baileys';

export { MessageDirection };

@Injectable()
export class ChatHistoryService {
  private readonly logger = new Logger(ChatHistoryService.name);

  constructor(
    @InjectRepository(ChatHistory)
    private readonly chatHistoryRepo: Repository<ChatHistory>,
  ) {}

  /**
   * Sync recent chats from Baileys socket
   */
  async syncRecentChats(deviceId: string, socket: WASocket, limit: number = 50): Promise<void> {
    try {
      this.logger.log(`Syncing recent chats for device ${deviceId}...`);
      
      // Fetch chats from Baileys store
      const chats = await socket.groupFetchAllParticipating?.() || {};
      const chatKeys = Object.keys(chats).slice(0, limit);
      
      for (const chatJid of chatKeys) {
        await this.syncChatMessages(deviceId, socket, chatJid, 20);
      }
      
      this.logger.log(`Synced ${chatKeys.length} chats for device ${deviceId}`);
    } catch (error) {
      this.logger.error(`Failed to sync chats for ${deviceId}: ${error.message}`);
    }
  }

  /**
   * Sync messages from a specific chat
   */
  async syncChatMessages(deviceId: string, socket: WASocket, chatJid: string, messageLimit: number = 20): Promise<void> {
    try {
      // Load messages from Baileys (if available in store)
      // Note: Baileys doesn't provide direct history fetch API like whatsapp-web.js
      // History comes through messages.upsert events after connection
      this.logger.debug(`Chat sync requested for ${chatJid} - history comes via real-time events`);
    } catch (error) {
      this.logger.error(`Failed to sync chat ${chatJid}: ${error.message}`);
    }
  }

  /**
   * Store incoming/outgoing message to history
   */
  async storeMessage(
    deviceId: string,
    msg: proto.IWebMessageInfo,
    direction: MessageDirection,
  ): Promise<ChatHistory> {
    try {
      const chatJid = msg.key?.remoteJid || '';
      const isGroup = chatJid.endsWith('@g.us');
      
      // Extract message content
      let content = '';
      let messageType = 'text';
      
      if (msg.message?.conversation) {
        content = msg.message.conversation;
      } else if (msg.message?.extendedTextMessage?.text) {
        content = msg.message.extendedTextMessage.text;
      } else if (msg.message?.imageMessage) {
        content = msg.message.imageMessage.caption || '[Image]';
        messageType = 'image';
      } else if (msg.message?.videoMessage) {
        content = msg.message.videoMessage.caption || '[Video]';
        messageType = 'video';
      } else if (msg.message?.audioMessage) {
        content = '[Audio]';
        messageType = 'audio';
      } else if (msg.message?.documentMessage) {
        content = msg.message.documentMessage.caption || '[Document]';
        messageType = 'document';
      }

      // Check if message already exists
      const existing = await this.chatHistoryRepo.findOne({
        where: { messageId: msg.key?.id || '' },
      });

      if (existing) {
        return existing;
      }

      const chatHistory = this.chatHistoryRepo.create({
        deviceId,
        chatJid,
        chatType: isGroup ? ChatType.GROUP : ChatType.INDIVIDUAL,
        messageId: msg.key?.id || '',
        direction,
        content,
        messageType,
        messageTimestamp: Number(msg.messageTimestamp) || Date.now(),
        isRead: msg.key?.fromMe || false,
        rawData: msg,
      });

      return await this.chatHistoryRepo.save(chatHistory);
    } catch (error) {
      this.logger.error(`Failed to store message: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get chat list for device (unique chats with latest message)
   */
  async getChatList(deviceId: string, limit: number = 50): Promise<ChatHistory[]> {
    const query = `
      SELECT DISTINCT ON (chat_jid) 
        ch.*,
        ch.chat_name as "chatName",
      MAX(ch.message_timestamp) as "lastMessageTimestamp"
      FROM chat_history ch
      WHERE ch.device_id = $1
      GROUP BY ch.chat_jid, ch.chat_type, ch.chat_name
      ORDER BY MAX(ch.message_timestamp) DESC
      LIMIT $2
    `;
    
    const results = await this.chatHistoryRepo.query(query, [deviceId, limit]);
    return results;
  }

  /**
   * Get messages for specific chat
   */
  async getChatMessages(
    deviceId: string,
    chatJid: string,
    limit: number = 50,
    beforeTimestamp?: number,
  ): Promise<ChatHistory[]> {
    const where: any = { deviceId, chatJid };
    
    if (beforeTimestamp) {
      where.messageTimestamp = LessThan(beforeTimestamp);
    }

    return this.chatHistoryRepo.find({
      where,
      order: { messageTimestamp: 'DESC' },
      take: limit,
    });
  }

  /**
   * Search messages
   */
  async searchMessages(deviceId: string, searchTerm: string, limit: number = 20): Promise<ChatHistory[]> {
    return this.chatHistoryRepo
      .createQueryBuilder('ch')
      .where('ch.device_id = :deviceId', { deviceId })
      .andWhere('ch.content ILIKE :searchTerm', { searchTerm: `%${searchTerm}%` })
      .orderBy('ch.message_timestamp', 'DESC')
      .limit(limit)
      .getMany();
  }

  /**
   * Mark messages as read
   */
  async markChatAsRead(deviceId: string, chatJid: string): Promise<void> {
    await this.chatHistoryRepo.update(
      { deviceId, chatJid, isRead: false },
      { isRead: true },
    );
  }

  /**
   * Get unread count per chat
   */
  async getUnreadCounts(deviceId: string): Promise<{ chatJid: string; count: number }[]> {
    const result = await this.chatHistoryRepo
      .createQueryBuilder('ch')
      .select('ch.chat_jid', 'chatJid')
      .addSelect('COUNT(*)', 'count')
      .where('ch.device_id = :deviceId', { deviceId })
      .andWhere('ch.is_read = false')
      .andWhere('ch.direction = :direction', { direction: MessageDirection.INCOMING })
      .groupBy('ch.chat_jid')
      .getRawMany();

    return result;
  }

  /**
   * Delete old messages (cleanup)
   */
  async cleanupOldMessages(days: number = 30): Promise<number> {
    const cutoffDate = Date.now() - (days * 24 * 60 * 60 * 1000);
    
    const result = await this.chatHistoryRepo.delete({
      messageTimestamp: LessThan(cutoffDate),
    });

    return result.affected || 0;
  }
}
