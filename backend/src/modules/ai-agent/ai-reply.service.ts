import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import * as dayjs from 'dayjs';
import * as timezone from 'dayjs/plugin/timezone';
import * as utc from 'dayjs/plugin/utc';
import { AIAgent } from './entities/ai-agent.entity';
import { Device } from '../devices/entities/device.entity';
import { ConversationsService } from '../conversations/conversations.service';
import { KnowledgeBaseService } from '../knowledge-base/knowledge-base.service';
import { WhatsAppService } from '../../whatsapp/whatsapp.service';
import { MessageRole } from '../conversations/entities/conversation-message.entity';
import { AiWebhookService } from './ai-webhook.service';
import { WhatsAppMessage } from '../../whatsapp/whatsapp.service';

dayjs.extend(utc);
dayjs.extend(timezone);

@Injectable()
export class AiReplyService {
  private readonly logger = new Logger(AiReplyService.name);

  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly whatsappService: WhatsAppService,
    private readonly kbService: KnowledgeBaseService,
    private readonly aiWebhookService: AiWebhookService,
    private readonly configService: ConfigService,
  ) {}

  resolveClient(agent: AIAgent): OpenAI {
    const apiKey = agent.aiApiKey;
    if (!apiKey) {
      throw new Error(`AI agent for device ${agent.deviceId} has no API key configured.`);
    }
    return new OpenAI({ apiKey, baseURL: agent.aiBaseUrl || undefined });
  }

  isWithinOperatingHours(agent: AIAgent): boolean {
    if (agent.alwaysOn) return true;
    const now = dayjs().tz(agent.timezone || 'Asia/Jakarta');
    const [startH, startM] = agent.operatingStart.split(':').map(Number);
    const [endH, endM] = agent.operatingEnd.split(':').map(Number);
    const currentMinutes = now.hour() * 60 + now.minute();
    return currentMinutes >= startH * 60 + startM && currentMinutes <= endH * 60 + endM;
  }

  isHandoffRequest(message: string, keywords: string[]): boolean {
    if (!keywords?.length) return false;
    const lower = message.toLowerCase();
    return keywords.some((kw) => lower.includes(kw.toLowerCase()));
  }

  calculateTypingDuration(replyLength: number, agent: AIAgent): number {
    const duration = replyLength * agent.typingDelayPerChar;
    return Math.min(Math.max(duration, agent.minTypingDelay), agent.maxTypingDelay);
  }

  buildDefaultSystemPrompt(persona: string): string {
    return `Kamu adalah ${persona}, asisten customer service berbasis AI yang ramah dan profesional.
Kamu membantu pelanggan dengan sopan, sabar, dan memberikan informasi yang akurat.
Gunakan bahasa yang natural dan manusiawi.
Jika tidak tahu jawabannya, jujur saja.
Balasan harus singkat, jelas, dan tidak bertele-tele. Gunakan emoji secukupnya agar terasa hangat.

Tentang identitasmu:
- Kamu adalah AI assistant, bukan manusia. Jika ditanya "apakah kamu AI/bot/robot?", jawab jujur bahwa kamu adalah AI.
- Jika ditanya "apakah kamu manusia?", jelaskan bahwa kamu adalah asisten AI yang siap membantu.
- Pertanyaan tentang identitasmu BUKAN permintaan handoff — tetap jawab dengan ramah.`;
  }

  buildHandoffInstruction(keywords: string[]): string {
    if (!keywords?.length) return '';
    const kwList = keywords.map(k => `"${k}"`).join(', ');
    return `

---INSTRUKSI HANDOFF---
PENTING: Kamu DILARANG memutuskan sendiri untuk melakukan handoff.
Token [HANDOFF] HANYA boleh ditambahkan jika pesan customer mengandung salah satu kata kunci berikut secara harfiah: ${kwList}.
Jika customer bertanya tentang identitasmu, tidak tahu, atau kamu tidak bisa menjawab — tetap balas semampumu, JANGAN tambahkan [HANDOFF].
Jika pesan customer memang mengandung salah satu kata kunci di atas, tulis balasan perpisahan lalu tambahkan [HANDOFF] di akhir.
Contoh: "Baik, saya hubungkan ke CS kami ya 😊 [HANDOFF]"
---AKHIR INSTRUKSI---`;
  }

  async processAIReply(
    deviceId: string,
    phone: string,
    convId: string,
    device: Device,
    agent: AIAgent,
    isGroup = false,
  ): Promise<void> {
    try {
      this.logger.log(`[AI PROCESS] Processing aggregated messages for ${phone}`);

      const isHuman = await this.conversationsService.isHumanTakeover(deviceId, phone);
      if (isHuman) {
        this.logger.log(`[AI PROCESS] Human takeover active for ${phone}, skipping delayed AI reply`);
        return;
      }

      const history = await this.conversationsService.getRecentMessages(convId, agent.contextWindow);
      const basePrompt = agent.systemPrompt || this.buildDefaultSystemPrompt(agent.persona || 'CS Assistant');
      const kbContext = await this.kbService.buildContext(deviceId);
      const handoffInstruction = this.buildHandoffInstruction(agent.handoffKeywords);

      const lastUserMessages = history.filter(m => m.role === MessageRole.USER).slice(-5);
      const lastMessage = lastUserMessages[lastUserMessages.length - 1]?.content || '';

      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: basePrompt + kbContext + handoffInstruction },
        ...history.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ];

      const typingDuration = this.calculateTypingDuration(lastMessage.length, agent);
      const typingPromise = this.whatsappService.sendTyping(deviceId, phone, typingDuration, isGroup);

      const client = this.resolveClient(agent);
      const completion = await client.chat.completions.create({
        model: agent.model || 'gpt-4o',
        messages,
        temperature: agent.temperature,
        max_tokens: agent.maxTokens,
      });

      await typingPromise;

      const rawReply = completion.choices[0]?.message?.content || '';
      const tokenCount = completion.usage?.total_tokens || 0;
      const aiSaysHandoff = rawReply.includes('[HANDOFF]');
      const customerRequestedHandoff = this.isHandoffRequest(lastMessage, agent.handoffKeywords);
      const isHandoff = aiSaysHandoff && customerRequestedHandoff;
      const reply = rawReply.replace(/\[HANDOFF\]/g, '').trim();

      this.logger.log(`[AI PROCESS] Reply generated (${tokenCount} tokens, handoff: ${isHandoff})`);

      if (!reply) {
        this.logger.warn(`[AI PROCESS] Empty reply received`);
        return;
      }

      await this.sendReply(device, phone, reply, agent, isGroup);

      if (isHandoff) {
        await this.conversationsService.escalate(deviceId, phone);
        if (agent.handoffWebhookUrl) {
          const conv = await this.conversationsService.findOrCreate(deviceId, phone);
          this.aiWebhookService.notifyHandoff(agent.handoffWebhookUrl, { deviceId, phone } as WhatsAppMessage, conv.id).catch(() => {});
        }
      }

      await this.conversationsService.addMessage(convId, MessageRole.ASSISTANT, reply, tokenCount, agent.model);
    } catch (err) {
      this.logger.error(`[AI PROCESS] Error for ${phone}: ${err.message}`);
    }
  }

  async sendReply(device: Device, phone: string, message: string, agent: AIAgent, isGroup = false): Promise<void> {
    const maxRetries = this.configService.get<number>('webhook.retryAttempts') ?? 3;
    const retryDelayMs = this.configService.get<number>('webhook.retryDelay') ?? 3000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.whatsappService.waitUntilConnected(device.deviceId, 12000);

        if (agent.simulateTyping) {
          const typingMs = this.calculateTypingDuration(message.length, agent);
          await this.whatsappService.sendTyping(device.deviceId, phone, typingMs, isGroup);
        }

        const messageId = await this.whatsappService.sendText(device.deviceId, { phone, message, isGroup });
        this.logger.log(`[AI REPLY] Sent to ${phone} (attempt ${attempt}). ID: ${messageId}`);
        return;
      } catch (error) {
        this.logger.error(`[AI REPLY] Attempt ${attempt}/${maxRetries} failed for ${phone}: ${error.message}`);
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        } else {
          throw error;
        }
      }
    }
  }
}
