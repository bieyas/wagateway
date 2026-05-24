import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { AIAgent } from './entities/ai-agent.entity';
import { ConversationsService } from '../conversations/conversations.service';
import { WhatsAppService, WhatsAppMessage } from '../../whatsapp/whatsapp.service';
import { Device } from '../devices/entities/device.entity';
import { MessageRole } from '../conversations/entities/conversation-message.entity';
import { AiReplyService } from './ai-reply.service';
import { AiWebhookService } from './ai-webhook.service';

@Injectable()
export class AIAgentService implements OnModuleInit {
  private readonly logger = new Logger(AIAgentService.name);
  private whitelistByDevice = new Map<string, { devMode: boolean; phones: Set<string> }>();
  private blacklistByDevice = new Map<string, Set<string>>();
  // Maps LID number → phone number per device (e.g. "11210015658176" → "6281228240369")
  private lidToPhoneMap = new Map<string, Map<string, string>>();
  // Debounce timers for burst message aggregation: key = "deviceId:phone"
  private debounceTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    @InjectRepository(AIAgent)
    private readonly agentRepo: Repository<AIAgent>,
    @InjectRepository(Device)
    private readonly deviceRepo: Repository<Device>,
    private readonly conversationsService: ConversationsService,
    private readonly whatsappService: WhatsAppService,
    private readonly aiReplyService: AiReplyService,
    private readonly aiWebhookService: AiWebhookService,
  ) {}

  async onModuleInit() {
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

  @OnEvent('lid.mapping')
  handleLidMapping(payload: { deviceId: string; lid: string; phoneNumber: string }): void {
    this.registerLidMapping(payload.deviceId, payload.lid, payload.phoneNumber);
    this.logger.log(`[LID MAP] ${payload.lid} → ${payload.phoneNumber} (device: ${payload.deviceId})`);
  }

  @OnEvent('message.status')
  async handleMessageStatus(payload: { deviceId: string; whatsappMessageId: string; status: number }): Promise<void> {
    const device = await this.deviceRepo.findOne({ where: { deviceId: payload.deviceId } });
    if (device?.trackingUrl) {
      this.aiWebhookService.forwardMessageStatus(device.trackingUrl, payload).catch(() => {});
    }
  }

  @OnEvent('message.incoming')
  async handleIncomingMessage(payload: WhatsAppMessage): Promise<void> {
    this.logger.log(`[INCOMING] ${payload.deviceId} ← ${payload.phone} (${payload.type})`);

    if (!payload.message?.trim() && !payload.mediaUrl) return;

    try {
      // Forward to device webhookUrl immediately (before any AI/whitelist filtering)
      const deviceForWebhook = await this.deviceRepo.findOne({ where: { deviceId: payload.deviceId, isActive: true } });
      if (deviceForWebhook?.webhookUrl) {
        this.aiWebhookService.forwardIncomingWebhook(deviceForWebhook, payload).catch(() => {});
      }

      // For group messages, phone is already the group JID (@g.us) — no LID resolution needed.
      // For individual messages, resolve LID to real phone number for whitelist/blacklist checks.
      let resolvedPhone = payload.phone;
      if (!payload.isGroup) {
        resolvedPhone = this.whatsappService.resolvePhoneFromLid(payload.deviceId, payload.phone);
        if (resolvedPhone === payload.phone && payload.senderPn) {
          resolvedPhone = payload.senderPn;
        }
        if (resolvedPhone !== payload.phone) {
          this.logger.log(`[INCOMING] LID resolved: ${payload.phone} → ${resolvedPhone}`);
        }
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

      // Always save message to conversation so CS can see it regardless of whitelist
      const isHuman = await this.conversationsService.isHumanTakeover(payload.deviceId, resolvedPhone);
      // For groups: use groupName as contactName so the conversation list shows the group name, not the sender's name
      const contactNameForConv = payload.isGroup ? (payload.groupName || payload.phone) : payload.senderName;
      const conv = await this.conversationsService.findOrCreate(
        payload.deviceId,
        resolvedPhone,
        contactNameForConv,
        {
          isGroup: payload.isGroup,
          groupId: payload.groupId,
          groupName: payload.groupName,
        },
      );
      await this.conversationsService.addMessage(
        conv.id,
        MessageRole.USER,
        payload.message || '',
        0,
        undefined,
        payload.mediaUrl,
        payload.type !== 'text' ? payload.type : undefined,
        payload.isGroup ? payload.senderName : undefined,
      );
      await this.conversationsService.incrementUnread(payload.deviceId, resolvedPhone);

      if (isHuman) return;

      // Whitelist check: only blocks AI auto-reply, message is already saved above
      if (!this.isWhitelisted(payload.deviceId, resolvedPhone)) {
        const wl = this.getWhitelistStatus(payload.deviceId);
        this.logger.warn(`[INCOMING] AI SKIPPED - ${resolvedPhone} not in whitelist (devMode, ${wl.phones.length} allowed)`);
        return;
      }

      const agent = await this.agentRepo.findOne({ where: { deviceId: payload.deviceId, enabled: true } });
      if (!agent) {
        this.logger.warn(`[INCOMING] No AI agent for device ${payload.deviceId}`);
        return;
      }

      // Group AI reply gating
      if (payload.isGroup) {
        if (!agent.groupEnabled) {
          this.logger.log(`[INCOMING] AI SKIPPED - group replies disabled for device ${payload.deviceId}`);
          return;
        }
        // Allowed groups whitelist: match by group name (case-insensitive) so users don't need to know the JID
        if (agent.allowedGroups?.length) {
          const incomingName = (payload.groupName || '').toLowerCase().trim();
          const allowed = agent.allowedGroups.some(g => g.toLowerCase().trim() === incomingName);
          if (!allowed) {
            this.logger.log(`[INCOMING] AI SKIPPED - group "${payload.groupName}" not in allowedGroups`);
            return;
          }
        }
        // Mention-only mode: only reply if bot is mentioned via phone or LID (WA Business uses LID for mentions)
        if (agent.groupMentionOnly && payload.message) {
          const devicePhone = device.phone || '';
          const deviceLid = (device as any).selfLid || '';

          // Auto-learn bot's LID from mentionedIds.
          // Trigger when selfLid is unset or incorrectly set to the same value as phone.
          const lidIsUnknown = !deviceLid || deviceLid === devicePhone;
          if (lidIsUnknown && payload.mentionedIds?.length) {
            const newLid = payload.mentionedIds.find(id => id !== devicePhone);
            if (newLid) {
              await this.deviceRepo.update({ deviceId: payload.deviceId }, { selfLid: newLid } as any);
              Object.assign(device, { selfLid: newLid });
              this.logger.log(`[MENTION] Auto-learned bot LID for ${payload.deviceId}: ${newLid}`);
            }
          }

          // currentLid is updated in-memory by auto-learn above (if triggered)
          const currentLid = (device as any).selfLid || '';
          const mentionedInData = !!(
            (devicePhone && payload.mentionedIds?.includes(devicePhone)) ||
            (currentLid && payload.mentionedIds?.includes(currentLid))
          );
          const mentionedInText = !!(
            (devicePhone && payload.message.includes(`@${devicePhone}`)) ||
            (currentLid && payload.message.includes(`@${currentLid}`))
          );
          if (!mentionedInData && !mentionedInText) {
            this.logger.log(`[INCOMING] AI SKIPPED - groupMentionOnly enabled and bot not mentioned`);
            return;
          }
        }
        // Prefix mode: only apply when groupMentionOnly is OFF (they are mutually exclusive)
        if (!agent.groupMentionOnly && agent.groupPrefix && payload.message) {
          if (!payload.message.trimStart().startsWith(agent.groupPrefix)) {
            this.logger.log(`[INCOMING] AI SKIPPED - groupPrefix "${agent.groupPrefix}" not found`);
            return;
          }
        }
      }

      if (!this.aiReplyService.isWithinOperatingHours(agent)) {
        if (agent.outsideHoursMessage) {
          await this.aiReplyService.sendReply(device, resolvedPhone, agent.outsideHoursMessage, agent, payload.isGroup);
        }
        return;
      }

      // Burst aggregation: debounce AI reply by typingDelay seconds
      const debounceKey = `${payload.deviceId}:${resolvedPhone}`;
      const delayMs = (agent.typingDelay ?? 10) * 1000;
      const existing = this.debounceTimers.get(debounceKey);
      if (existing) {
        clearTimeout(existing);
        this.logger.log(`[DEBOUNCE] Reset timer for ${resolvedPhone} (${delayMs}ms)`);
      }
      const timer = setTimeout(() => {
        this.debounceTimers.delete(debounceKey);
        this.aiReplyService.processAIReply(payload.deviceId, resolvedPhone, conv.id, device, agent, payload.isGroup).catch(err =>
          this.logger.error(`[DEBOUNCE] processAIReply error: ${err.message}`),
        );
      }, delayMs);
      this.debounceTimers.set(debounceKey, timer);
      this.logger.log(`[DEBOUNCE] Timer set for ${resolvedPhone}, reply in ${delayMs}ms`);

    } catch (err) {
      this.logger.error(`[INCOMING] AI agent error for device ${payload.deviceId}: ${err.message}`);
      this.logger.error(`[INCOMING] Error stack: ${err.stack}`);
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleHandoffTimeout(): Promise<void> {
    try {
      const agents = await this.agentRepo.find({ where: { enabled: true } });
      for (const agent of agents) {
        const timeout = agent.handoffTimeout ?? 30;
        if (!timeout) continue;
        const timedOut = await this.conversationsService.findEscalatedTimedOut(agent.deviceId, timeout);
        for (const conv of timedOut) {
          await this.conversationsService.releaseToAI(agent.deviceId, conv.phone);
          this.logger.log(`[AUTO-RELEASE] ${conv.phone} on device ${agent.deviceId} returned to AI after ${timeout}min inactivity`);
        }
      }
    } catch (err) {
      this.logger.error(`[AUTO-RELEASE] Cron error: ${err.message}`);
    }
  }

  async getConfig(deviceId: string): Promise<AIAgent | null> {
    return this.agentRepo.findOne({ where: { deviceId } });
  }

  async updateGroupConfig(deviceId: string, dto: { groupEnabled?: boolean; allowedGroups?: string[]; groupMentionOnly?: boolean; groupPrefix?: string }): Promise<AIAgent> {
    let agent = await this.agentRepo.findOne({ where: { deviceId } });
    if (!agent) agent = this.agentRepo.create({ deviceId });
    if (dto.groupEnabled !== undefined) agent.groupEnabled = dto.groupEnabled;
    if (dto.allowedGroups !== undefined) agent.allowedGroups = dto.allowedGroups;
    if (dto.groupMentionOnly !== undefined) agent.groupMentionOnly = dto.groupMentionOnly;
    if (dto.groupPrefix !== undefined) agent.groupPrefix = dto.groupPrefix;
    return this.agentRepo.save(agent);
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
    if (dto.aiProvider !== undefined) agent.aiProvider = dto.aiProvider;
    if (dto.aiApiKey !== undefined) agent.aiApiKey = dto.aiApiKey ?? '';
    if (dto.aiBaseUrl !== undefined) agent.aiBaseUrl = dto.aiBaseUrl ?? '';
    if (dto.handoffTimeout !== undefined) agent.handoffTimeout = dto.handoffTimeout;
    if (dto.typingDelay !== undefined) agent.typingDelay = dto.typingDelay;
    return this.agentRepo.save(agent);
  }
}
