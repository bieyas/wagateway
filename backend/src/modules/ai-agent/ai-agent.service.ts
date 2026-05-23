import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import OpenAI from 'openai';
import * as dayjs from 'dayjs';
import * as timezone from 'dayjs/plugin/timezone';
import * as utc from 'dayjs/plugin/utc';
import { AIAgent } from './entities/ai-agent.entity';
import { ConversationsService } from '../conversations/conversations.service';
import { WhatsAppService, WhatsAppMessage } from '../../whatsapp/whatsapp.service';
import { Device } from '../devices/entities/device.entity';
import { MessageRole } from '../conversations/entities/conversation-message.entity';

dayjs.extend(utc);
dayjs.extend(timezone);

@Injectable()
export class AIAgentService implements OnModuleInit {
  private readonly logger = new Logger(AIAgentService.name);
  private openai: OpenAI;
  private whitelistByDevice = new Map<string, { devMode: boolean; phones: Set<string> }>();
  private blacklistByDevice = new Map<string, Set<string>>();
  // Maps LID number → phone number per device (e.g. "11210015658176" → "6281228240369")
  private lidToPhoneMap = new Map<string, Map<string, string>>();

  constructor(
    @InjectRepository(AIAgent)
    private readonly agentRepo: Repository<AIAgent>,
    @InjectRepository(Device)
    private readonly deviceRepo: Repository<Device>,
    private readonly conversationsService: ConversationsService,
    private readonly whatsappService: WhatsAppService,
    private readonly configService: ConfigService,
  ) {}


  async onModuleInit() {
    const apiKey = this.configService.get<string>('openai.apiKey');
    this.openai = new OpenAI({ apiKey });

    const agents = await this.agentRepo.find();
    for (const agent of agents) {
      this.whitelistByDevice.set(agent.deviceId, {
        devMode: agent.devMode ?? false,
        phones: new Set(agent.whitelistPhones ?? []),
      });
      if (agent.blacklistPhones?.length) {
        this.blacklistByDevice.set(agent.deviceId, new Set(agent.blacklistPhones));
      }
    }
    this.logger.log(`[DEV MODE] Loaded ${agents.filter(a => a.devMode).length} device(s) in dev mode`);
    const total = [...this.blacklistByDevice.values()].reduce((s, v) => s + v.size, 0);
    this.logger.log(`[BLACKLIST] Loaded ${total} number(s) across ${this.blacklistByDevice.size} device(s) from DB`);
  }

  registerLidMapping(deviceId: string, lid: string, phone: string): void {
    if (!this.lidToPhoneMap.has(deviceId)) this.lidToPhoneMap.set(deviceId, new Map());
    this.lidToPhoneMap.get(deviceId)!.set(lid, phone);
  }

  private resolveToPhone(deviceId: string, identifier: string): string {
    return this.lidToPhoneMap.get(deviceId)?.get(identifier) ?? identifier;
  }

  private isWhitelisted(deviceId: string, phone: string): boolean {
    const entry = this.whitelistByDevice.get(deviceId);
    if (!entry || !entry.devMode) return true;
    if (entry.phones.size === 0) return false;
    // Check both the raw identifier and the resolved phone number
    const resolved = this.resolveToPhone(deviceId, phone);
    return entry.phones.has(phone) || entry.phones.has(resolved);
  }

  private isBlacklisted(deviceId: string, phone: string): boolean {
    const set = this.blacklistByDevice.get(deviceId);
    if (!set) return false;
    const resolved = this.resolveToPhone(deviceId, phone);
    return set.has(phone) || set.has(resolved);
  }

  getWhitelistStatus(deviceId: string): { devMode: boolean; phones: string[] } {
    const entry = this.whitelistByDevice.get(deviceId);
    return {
      devMode: entry?.devMode ?? false,
      phones: [...(entry?.phones ?? [])],
    };
  }

  async setDevMode(deviceId: string, devMode: boolean): Promise<void> {
    const entry = this.whitelistByDevice.get(deviceId) ?? { devMode: false, phones: new Set<string>() };
    entry.devMode = devMode;
    this.whitelistByDevice.set(deviceId, entry);
    await this.persistWhitelist(deviceId);
    this.logger.log(`[DEV MODE][${deviceId}] ${devMode ? 'ENABLED' : 'DISABLED'}`);
  }

  async addToWhitelist(deviceId: string, phone: string): Promise<void> {
    const entry = this.whitelistByDevice.get(deviceId) ?? { devMode: false, phones: new Set<string>() };
    entry.phones.add(phone);
    this.whitelistByDevice.set(deviceId, entry);
    await this.persistWhitelist(deviceId);
    this.logger.log(`[WHITELIST][${deviceId}] Added: ${phone}`);
  }

  async removeFromWhitelist(deviceId: string, phone: string): Promise<void> {
    this.whitelistByDevice.get(deviceId)?.phones.delete(phone);
    await this.persistWhitelist(deviceId);
    this.logger.log(`[WHITELIST][${deviceId}] Removed: ${phone}`);
  }

  private async persistWhitelist(deviceId: string): Promise<void> {
    const agent = await this.agentRepo.findOne({ where: { deviceId } });
    if (agent) {
      const entry = this.whitelistByDevice.get(deviceId);
      agent.devMode = entry?.devMode ?? false;
      agent.whitelistPhones = [...(entry?.phones ?? [])];
      await this.agentRepo.save(agent);
    }
  }

  getBlacklistStatus(deviceId: string): { phones: string[] } {
    return { phones: [...(this.blacklistByDevice.get(deviceId) ?? [])] };
  }

  async addToBlacklist(deviceId: string, phone: string): Promise<void> {
    if (!this.blacklistByDevice.has(deviceId)) this.blacklistByDevice.set(deviceId, new Set());
    this.blacklistByDevice.get(deviceId)!.add(phone);
    await this.persistBlacklist(deviceId);
    this.logger.log(`[BLACKLIST][${deviceId}] Added: ${phone}`);
  }

  async removeFromBlacklist(deviceId: string, phone: string): Promise<void> {
    this.blacklistByDevice.get(deviceId)?.delete(phone);
    await this.persistBlacklist(deviceId);
    this.logger.log(`[BLACKLIST][${deviceId}] Removed: ${phone}`);
  }

  async setBlacklist(deviceId: string, phones: string[]): Promise<void> {
    this.blacklistByDevice.set(deviceId, new Set(phones));
    await this.persistBlacklist(deviceId);
    this.logger.log(`[BLACKLIST][${deviceId}] Set to ${phones.length} number(s)`);
  }

  private async persistBlacklist(deviceId: string): Promise<void> {
    const agent = await this.agentRepo.findOne({ where: { deviceId } });
    if (agent) {
      agent.blacklistPhones = [...(this.blacklistByDevice.get(deviceId) ?? [])];
      await this.agentRepo.save(agent);
    }
  }

  async updateGroupConfig(deviceId: string, dto: {
    groupEnabled?: boolean;
    allowedGroups?: string[];
    groupMentionOnly?: boolean;
    groupPrefix?: string;
  }): Promise<AIAgent> {
    let agent = await this.agentRepo.findOne({ where: { deviceId } });
    if (!agent) agent = this.agentRepo.create({ deviceId });
    if (dto.groupEnabled !== undefined) agent.groupEnabled = dto.groupEnabled;
    if (dto.allowedGroups !== undefined) agent.allowedGroups = dto.allowedGroups;
    if (dto.groupMentionOnly !== undefined) agent.groupMentionOnly = dto.groupMentionOnly;
    if (dto.groupPrefix !== undefined) agent.groupPrefix = dto.groupPrefix;
    return this.agentRepo.save(agent);
  }

  private isBotMentioned(payload: WhatsAppMessage, devicePhone: string): boolean {
    if (payload.mentionedIds?.length) {
      return payload.mentionedIds.some((id) => id === devicePhone || id.startsWith(devicePhone));
    }
    return false;
  }

  private hasGroupPrefix(message: string, prefix: string): boolean {
    if (!prefix) return false;
    return message.trim().toLowerCase().startsWith(prefix.toLowerCase());
  }

  private stripGroupPrefix(message: string, prefix: string): string {
    if (!prefix || !message.trim().toLowerCase().startsWith(prefix.toLowerCase())) return message;
    return message.trim().slice(prefix.length).trim();
  }

  @OnEvent('lid.mapping')
  handleLidMapping(payload: { deviceId: string; lid: string; phoneNumber: string }): void {
    this.registerLidMapping(payload.deviceId, payload.lid, payload.phoneNumber);
    this.logger.log(`[LID MAP] ${payload.lid} → ${payload.phoneNumber} (device: ${payload.deviceId})`);
  }

  @OnEvent('message.incoming')
  async handleIncomingMessage(payload: WhatsAppMessage): Promise<void> {
    // Log semua data pesan masuk
    this.logger.log(`[INCOMING MESSAGE] ==========================================`);
    this.logger.log(`[INCOMING] deviceId: ${payload.deviceId}`);
    this.logger.log(`[INCOMING] phone: ${payload.phone}`);
    this.logger.log(`[INCOMING] senderName: ${payload.senderName}`);
    this.logger.log(`[INCOMING] senderPn: ${payload.senderPn || 'none'}`);
    this.logger.log(`[INCOMING] message: "${payload.message}"`);
    this.logger.log(`[INCOMING] type: ${payload.type}`);
    this.logger.log(`[INCOMING] isGroup: ${payload.isGroup}`);
    this.logger.log(`[INCOMING] groupId: ${payload.groupId}`);
    this.logger.log(`[INCOMING] whatsappMessageId: ${payload.whatsappMessageId}`);
    this.logger.log(`[INCOMING] timestamp: ${payload.timestamp}`);
    this.logger.log(`[INCOMING MESSAGE] ==========================================`);

    if (!payload.message?.trim() && !payload.mediaUrl) {
      this.logger.log(`[INCOMING] Empty message and no media, skipping`);
      return;
    }

    try {
      // Forward to device webhookUrl immediately (before any AI/whitelist filtering)
      const deviceForWebhook = await this.deviceRepo.findOne({ where: { deviceId: payload.deviceId, isActive: true } });
      if (deviceForWebhook?.webhookUrl) {
        this.forwardIncomingWebhook(deviceForWebhook, payload).catch(() => {});
      }

      // Resolve LID (@lid) to real phone number for whitelist/blacklist checks
      // Priority: lidPhoneMap lookup → senderPn from payload → raw phone
      let resolvedPhone = this.whatsappService.resolvePhoneFromLid(payload.deviceId, payload.phone);
      if (resolvedPhone === payload.phone && payload.senderPn) {
        resolvedPhone = payload.senderPn;
      }
      if (resolvedPhone !== payload.phone) {
        this.logger.log(`[INCOMING] LID resolved: ${payload.phone} → ${resolvedPhone}`);
      }

      if (this.isBlacklisted(payload.deviceId, resolvedPhone)) {
        this.logger.log(`[INCOMING] IGNORED - ${resolvedPhone} is in blacklist for device ${payload.deviceId}`);
        return;
      }

      const device = await this.deviceRepo.findOne({ where: { deviceId: payload.deviceId, isActive: true } });
      if (!device) {
        this.logger.warn(`[INCOMING] Device ${payload.deviceId} not found or inactive`);
        return;
      }
      this.logger.log(`[INCOMING] Device found: ${device.deviceId}, status: ${device.status}`);

      // Group message handling
      if (payload.isGroup) {
        const agentCfg = await this.agentRepo.findOne({ where: { deviceId: payload.deviceId } });

        // Always save to conversation so CS can see group messages
        const groupConv = await this.conversationsService.findOrCreate(
          payload.deviceId,
          payload.groupId!,
          payload.groupName || payload.groupId,
        );
        await this.conversationsService.addMessage(
          groupConv.id,
          MessageRole.USER,
          payload.message || '',
          0,
          undefined,
          payload.mediaUrl,
          payload.type !== 'text' ? payload.type : undefined,
        );
        this.logger.log(`[GROUP] Message saved to conversation ${groupConv.id} (group: ${payload.groupName || payload.groupId})`);

        if (!agentCfg?.groupEnabled) {
          this.logger.log(`[GROUP] AI for groups disabled, skipping`);
          return;
        }

        // Check allowed groups whitelist
        if (agentCfg.allowedGroups?.length) {
          const allowed = agentCfg.allowedGroups.some(
            (g) => g === payload.groupId || g === payload.groupName,
          );
          if (!allowed) {
            this.logger.log(`[GROUP] Group ${payload.groupId} not in allowed list, skipping AI`);
            return;
          }
        }

        // Check mention or prefix trigger
        const devicePhone = device.phone || '';
        const mentioned = this.isBotMentioned(payload, devicePhone);
        const prefixed = agentCfg.groupPrefix
          ? this.hasGroupPrefix(payload.message, agentCfg.groupPrefix)
          : false;

        if (agentCfg.groupMentionOnly && !mentioned && !prefixed) {
          this.logger.log(`[GROUP] Bot not mentioned and no prefix, skipping AI`);
          return;
        }

        // Strip prefix from message before sending to AI
        if (prefixed && agentCfg.groupPrefix) {
          payload = { ...payload, message: this.stripGroupPrefix(payload.message, agentCfg.groupPrefix) };
        }

        this.logger.log(`[GROUP] Trigger detected (mention=${mentioned}, prefix=${prefixed}), proceeding with AI`);
        // Continue with AI processing below using groupId as phone target
        resolvedPhone = payload.groupId!;
      }

      // Save message to conversation (group messages already saved above)
      const isHuman = !payload.isGroup && await this.conversationsService.isHumanTakeover(payload.deviceId, resolvedPhone);
      const conv = payload.isGroup
        ? await this.conversationsService.findOrCreate(payload.deviceId, payload.groupId!, payload.groupName || payload.groupId)
        : await this.conversationsService.findOrCreate(payload.deviceId, resolvedPhone, payload.senderName);

      if (!payload.isGroup) {
        await this.conversationsService.addMessage(
          conv.id,
          MessageRole.USER,
          payload.message || '',
          0,
          undefined,
          payload.mediaUrl,
          payload.type !== 'text' ? payload.type : undefined,
        );
        this.logger.log(`[INCOMING] Message saved to conversation ${conv.id}`);
      }

      // If human takeover, skip AI and stop here
      if (isHuman) {
        this.logger.log(`[INCOMING] Human takeover active for ${resolvedPhone}, skipping AI`);
        return;
      }

      // Whitelist check: only blocks AI auto-reply, message is already saved above
      if (!this.isWhitelisted(payload.deviceId, resolvedPhone)) {
        const wl = this.getWhitelistStatus(payload.deviceId);
        this.logger.warn(`[INCOMING] AI SKIPPED - ${resolvedPhone} not in whitelist (devMode, ${wl.phones.length} allowed)`);
        return;
      }
      this.logger.log(`[INCOMING] ACCEPTED - ${resolvedPhone} passed whitelist check`);

      const agent = await this.agentRepo.findOne({ where: { deviceId: payload.deviceId, enabled: true } });
      if (!agent) {
        this.logger.warn(`[INCOMING] No AI agent found for device ${payload.deviceId}`);
        return;
      }
      this.logger.log(`[INCOMING] AI Agent found: ${agent.model}, enabled: ${agent.enabled}`);

      if (!this.isWithinOperatingHours(agent)) {
        if (agent.outsideHoursMessage) {
          await this.sendReply(device, resolvedPhone, agent.outsideHoursMessage, agent, payload.isGroup);
        }
        return;
      }

      this.logger.log(`[INCOMING] Conversation ID: ${conv.id}`);

      if (this.isHandoffRequest(payload.message, agent.handoffKeywords)) {
        this.logger.log(`[INCOMING] Handoff request detected!`);
        await this.conversationsService.escalate(payload.deviceId, resolvedPhone);
        const handoffMsg = 'Baik, saya akan hubungkan Anda dengan agen kami. Mohon tunggu sebentar ya 😊';
        await this.sendReply(device, resolvedPhone, handoffMsg, agent, payload.isGroup);
        await this.conversationsService.addMessage(conv.id, MessageRole.ASSISTANT, handoffMsg);

        if (agent.handoffWebhookUrl) {
          this.notifyHandoff(agent.handoffWebhookUrl, payload, conv.id).catch(() => {});
        }
        return;
      }

      const history = await this.conversationsService.getRecentMessages(conv.id, agent.contextWindow);
      this.logger.log(`[INCOMING] History loaded: ${history.length} messages`);

      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: agent.systemPrompt || this.buildDefaultSystemPrompt(agent.persona || 'CS Assistant'),
        },
        ...history.slice(0, -1).map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user', content: payload.message },
      ];
      this.logger.log(`[INCOMING] OpenAI messages prepared: ${messages.length} items`);

      await this.whatsappService.markAsRead(payload.deviceId, resolvedPhone, payload.whatsappMessageId);

      const typingDuration = this.calculateTypingDuration(payload.message.length, agent);
      this.logger.log(`[INCOMING] Typing duration: ${typingDuration}ms`);
      const typingPromise = this.whatsappService.sendTyping(payload.deviceId, resolvedPhone, typingDuration, payload.isGroup);

      this.logger.log(`[OPENAI] Sending request to OpenAI...`);
      this.logger.log(`[OPENAI] Model: ${agent.model || 'gpt-4o'}`);
      this.logger.log(`[OPENAI] Temperature: ${agent.temperature}, MaxTokens: ${agent.maxTokens}`);
      
      const completion = await this.openai.chat.completions.create({
        model: agent.model || 'gpt-4o',
        messages,
        temperature: agent.temperature,
        max_tokens: agent.maxTokens,
      });
      
      this.logger.log(`[OPENAI] Response received!`);

      await typingPromise;

      const reply = completion.choices[0]?.message?.content || '';
      const tokenCount = completion.usage?.total_tokens || 0;
      
      this.logger.log(`[OPENAI] Reply content: "${reply.substring(0, 100)}..."`);
      this.logger.log(`[OPENAI] Token count: ${tokenCount}`);

      if (!reply) {
        this.logger.warn(`[OPENAI] Empty reply received!`);
        return;
      }

      this.logger.log(`[INCOMING] Sending AI reply...`);
      await this.sendReply(device, resolvedPhone, reply, agent, payload.isGroup);
      this.logger.log(`[INCOMING] Reply sent successfully!`);
      
      await this.conversationsService.addMessage(conv.id, MessageRole.ASSISTANT, reply, tokenCount, agent.model);
      this.logger.log(`[INCOMING] AI reply saved to conversation`);
      
    } catch (err) {
      this.logger.error(`[INCOMING] AI agent error for device ${payload.deviceId}: ${err.message}`);
      this.logger.error(`[INCOMING] Error stack: ${err.stack}`);
    }
  }

  private async sendReply(device: Device, phone: string, message: string, agent: AIAgent, isGroup = false): Promise<void> {
    const maxRetries = 3;
    const retryDelayMs = 3000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.whatsappService.waitUntilConnected(device.deviceId, 12000);

        this.logger.log(`[AI REPLY] Sending to ${phone} (attempt ${attempt}/${maxRetries}): "${message.substring(0, 50)}..."`);

        if (agent.simulateTyping) {
          const typingMs = this.calculateTypingDuration(message.length, agent);
          await this.whatsappService.sendTyping(device.deviceId, phone, typingMs, isGroup);
        }

        const messageId = await this.whatsappService.sendText(device.deviceId, {
          phone,
          message,
          isGroup,
        });

        this.logger.log(`[AI REPLY] Message sent successfully. ID: ${messageId}`);
        return;
      } catch (error) {
        this.logger.error(`[AI REPLY] Attempt ${attempt}/${maxRetries} failed to send to ${phone}: ${error.message}`);
        if (attempt < maxRetries) {
          this.logger.log(`[AI REPLY] Retrying in ${retryDelayMs}ms...`);
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        } else {
          throw error;
        }
      }
    }
  }

  private isWithinOperatingHours(agent: AIAgent): boolean {
    if (agent.alwaysOn) return true;
    const now = dayjs().tz(agent.timezone || 'Asia/Jakarta');
    const [startH, startM] = agent.operatingStart.split(':').map(Number);
    const [endH, endM] = agent.operatingEnd.split(':').map(Number);

    const currentMinutes = now.hour() * 60 + now.minute();
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }

  private isHandoffRequest(message: string, keywords: string[]): boolean {
    if (!keywords?.length) return false;
    const lower = message.toLowerCase();
    return keywords.some((kw) => lower.includes(kw.toLowerCase()));
  }

  private calculateTypingDuration(replyLength: number, agent: AIAgent): number {
    const duration = replyLength * agent.typingDelayPerChar;
    return Math.min(Math.max(duration, agent.minTypingDelay), agent.maxTypingDelay);
  }

  private buildDefaultSystemPrompt(persona: string): string {
    return `Kamu adalah ${persona}, customer service yang ramah dan profesional. 
Kamu membantu pelanggan dengan sopan, sabar, dan memberikan informasi yang akurat.
Gunakan bahasa yang natural dan manusiawi, bukan seperti robot.
Jika tidak tahu jawabannya, jujur saja dan tawarkan untuk menghubungkan dengan agen manusia.
Balasan harus singkat, jelas, dan tidak bertele-tele. Gunakan emoji secukupnya agar terasa hangat.`;
  }

  private async forwardIncomingWebhook(device: Device, payload: WhatsAppMessage): Promise<void> {
    if (!device.webhookUrl) return;
    try {
      const axios = await import('axios');
      await axios.default.post(device.webhookUrl, {
        phone: payload.phone,
        senderName: payload.senderName,
        message: payload.message || '',
        type: payload.type,
        mediaUrl: payload.mediaUrl || null,
        isGroup: payload.isGroup,
        groupId: payload.groupId || null,
        groupName: payload.groupName || null,
        deviceId: payload.deviceId,
        whatsappMessageId: payload.whatsappMessageId,
        timestamp: payload.timestamp,
      }, {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' },
      });
      this.logger.log(`[WEBHOOK] Forwarded to ${device.webhookUrl}`);
    } catch (err) {
      this.logger.warn(`[WEBHOOK] Failed to forward to ${device.webhookUrl}: ${err.message}`);
    }
  }

  private async notifyHandoff(webhookUrl: string, payload: WhatsAppMessage, conversationId: string): Promise<void> {
    const axios = await import('axios');
    await axios.default.post(webhookUrl, {
      event: 'handoff',
      conversationId,
      deviceId: payload.deviceId,
      phone: payload.phone,
      senderName: payload.senderName,
      lastMessage: payload.message,
      timestamp: new Date().toISOString(),
    }, { timeout: 10000 });
  }

  async getConfig(deviceId: string): Promise<AIAgent | null> {
    return this.agentRepo.findOne({ where: { deviceId } });
  }

  async upsertConfig(deviceId: string, dto: Partial<AIAgent>): Promise<AIAgent> {
    let agent = await this.agentRepo.findOne({ where: { deviceId } });
    if (!agent) agent = this.agentRepo.create({ deviceId });
    if (dto.enabled !== undefined) agent.enabled = dto.enabled;
    if (dto.model !== undefined) agent.model = dto.model;
    if (dto.systemPrompt !== undefined) agent.systemPrompt = dto.systemPrompt;
    if (dto.persona !== undefined) agent.persona = dto.persona;
    if (dto.temperature !== undefined) agent.temperature = dto.temperature;
    if (dto.maxTokens !== undefined) agent.maxTokens = dto.maxTokens;
    if (dto.contextWindow !== undefined) agent.contextWindow = dto.contextWindow;
    if (dto.alwaysOn !== undefined) agent.alwaysOn = dto.alwaysOn;
    if (dto.operatingStart !== undefined) agent.operatingStart = dto.operatingStart;
    if (dto.operatingEnd !== undefined) agent.operatingEnd = dto.operatingEnd;
    if (dto.timezone !== undefined) agent.timezone = dto.timezone;
    if (dto.handoffKeywords !== undefined) agent.handoffKeywords = dto.handoffKeywords;
    if (dto.handoffWebhookUrl !== undefined) agent.handoffWebhookUrl = dto.handoffWebhookUrl;
    if (dto.outsideHoursMessage !== undefined) agent.outsideHoursMessage = dto.outsideHoursMessage;
    if (dto.simulateTyping !== undefined) agent.simulateTyping = dto.simulateTyping;
    if (dto.typingDelayPerChar !== undefined) agent.typingDelayPerChar = dto.typingDelayPerChar;
    if (dto.minTypingDelay !== undefined) agent.minTypingDelay = dto.minTypingDelay;
    if (dto.maxTypingDelay !== undefined) agent.maxTypingDelay = dto.maxTypingDelay;
    return this.agentRepo.save(agent);
  }
}
