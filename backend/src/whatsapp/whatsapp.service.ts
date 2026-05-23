import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  WASocket,
  proto,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import * as path from 'path';
import * as fs from 'fs';
import { Device, DeviceStatus, WhatsAppEngine } from '../modules/devices/entities/device.entity';
import { ChatHistoryService, MessageDirection } from '../modules/chat-history/chat-history.service';
import { WWebJSEngine } from './engines/wwebjs.engine';
import { MediaService } from '../modules/media/media.service';

export interface SendTextOptions {
  phone: string;
  message: string;
  isGroup?: boolean;
}

export interface SendMediaOptions {
  phone: string;
  mediaUrl: string;
  caption?: string;
  filename?: string;
  isGroup?: boolean;
  type: 'image' | 'document' | 'video' | 'audio';
}

export interface WhatsAppMessage {
  deviceId: string;
  phone: string;
  senderPn?: string;
  senderName: string;
  message: string;
  type: string;
  isGroup: boolean;
  groupId?: string;
  groupName?: string;
  mentionedIds?: string[];
  mediaUrl?: string;
  whatsappMessageId: string;
  timestamp: number;
}

@Injectable()
export class WhatsAppService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(WhatsAppService.name);
  private sockets = new Map<string, WASocket>();
  private qrCodes = new Map<string, string>();
  private reconnectTimers = new Map<string, NodeJS.Timeout>();
  private connectingPromises = new Map<string, Promise<void>>();
  private lidPhoneMap = new Map<string, Map<string, string>>();
  private engineCache = new Map<string, WhatsAppEngine>();

  constructor(
    @InjectRepository(Device)
    private readonly deviceRepo: Repository<Device>,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly chatHistoryService: ChatHistoryService,
    private readonly wwebjsEngine: WWebJSEngine,
    private readonly mediaService: MediaService,
  ) {}

  private async getDeviceEngine(deviceId: string): Promise<WhatsAppEngine> {
    if (this.engineCache.has(deviceId)) return this.engineCache.get(deviceId)!;
    const device = await this.deviceRepo.findOne({ where: { deviceId } });
    const engine = device?.engine ?? WhatsAppEngine.BAILEYS;
    this.engineCache.set(deviceId, engine);
    return engine;
  }

  invalidateEngineCache(deviceId: string): void {
    this.engineCache.delete(deviceId);
  }

  async onApplicationBootstrap() {
    const devices = await this.deviceRepo.find({ where: { isActive: true } });
    for (const device of devices) {
      if (device.status === DeviceStatus.CONNECTED) {
        this.logger.log(`Auto-connecting device ${device.deviceId}`);
        await this.connect(device.deviceId).catch((err) =>
          this.logger.error(`Failed to connect ${device.deviceId}: ${err.message}`),
        );
      }
    }
  }

  async onApplicationShutdown() {
    for (const [deviceId, socket] of this.sockets.entries()) {
      try {
        await socket.logout();
      } catch {}
      this.sockets.delete(deviceId);
    }
  }

  getSessionPath(deviceId: string): string {
    const base = this.configService.get<string>('whatsapp.sessionPath') || './sessions';
    return path.resolve(base, deviceId);
  }

  async connect(deviceId: string): Promise<void> {
    const engine = await this.getDeviceEngine(deviceId);

    if (engine === WhatsAppEngine.WWEBJS) {
      this.logger.log(`[connect] Device ${deviceId} using WWebJS engine`);
      await this.wwebjsEngine.connect(deviceId);
      return;
    }

    if (this.sockets.has(deviceId)) {
      this.logger.warn(`Device ${deviceId} already has an active socket`);
      return;
    }

    const sessionPath = this.getSessionPath(deviceId);
    if (!fs.existsSync(sessionPath)) {
      fs.mkdirSync(sessionPath, { recursive: true });
    }

    try {
      const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
      const { version } = await fetchLatestBaileysVersion();

      const pinoLogger = (await import('pino')).default({ level: 'trace' });

    const socket = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      browser: ['WhatsApp Gateway', 'Chrome', '1.0.0'],
      generateHighQualityLinkPreview: false,
      logger: pinoLogger,
    });

    this.sockets.set(deviceId, socket);

    socket.ev.on('creds.update', saveCreds);

    socket.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        this.qrCodes.set(deviceId, qr);
        await this.updateDeviceStatus(deviceId, DeviceStatus.SCAN_QR);
        this.eventEmitter.emit('device.qr', { deviceId, qr });
      }

      if (update.reachoutTimeLock) {
        const tl = update.reachoutTimeLock as any;
        if (tl.isActive) {
          this.logger.warn(`[TIMELOCK] Device ${deviceId} is REACH-OUT TIMELOCKED! Type: ${tl.enforcementType}, Ends: ${tl.timeEnforcementEnds || 'unknown'}`);
          this.eventEmitter.emit('device.timelocked', { deviceId, timelock: tl });
        } else {
          this.logger.log(`[TIMELOCK] Device ${deviceId} reachout timelock is NOT active.`);
        }
      }

      if (connection === 'open') {
        this.qrCodes.delete(deviceId);
        const phone = socket.user?.id?.split(':')[0] || '';
        await this.deviceRepo.update({ deviceId }, { status: DeviceStatus.CONNECTED, phone });
        this.eventEmitter.emit('device.connected', { deviceId, phone });
        this.logger.log(`Device ${deviceId} connected (${phone})`);
        this.connectingPromises.delete(deviceId);

        setTimeout(async () => {
          try {
            const tl = await (socket as any).fetchAccountReachoutTimelock?.();
            if (tl?.isActive) {
              this.logger.warn(`[TIMELOCK] ACTIVE on ${deviceId} - type: ${tl.enforcementType}, ends: ${tl.timeEnforcementEnds || 'no expiry set'}`);
            } else {
              this.logger.log(`[TIMELOCK] Not active on ${deviceId}`);
            }
            const cap = await (socket as any).fetchNewChatMessageCap?.();
            if (cap) this.logger.log(`[NEW-CHAT-CAP] ${deviceId}: ${JSON.stringify(cap)}`);
          } catch (err) {
            this.logger.warn(`[TIMELOCK] Failed to check: ${err.message}`);
          }
        }, 3000);
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        this.sockets.delete(deviceId);

        if (statusCode === DisconnectReason.loggedOut) {
          // Delete session folder to allow fresh connect
          const sessionPath = this.getSessionPath(deviceId);
          if (fs.existsSync(sessionPath)) {
            fs.rmSync(sessionPath, { recursive: true, force: true });
            this.logger.log(`Session deleted for logged out device ${deviceId}`);
          }
          await this.updateDeviceStatus(deviceId, DeviceStatus.DISCONNECTED);
          this.eventEmitter.emit('device.disconnected', { deviceId, reason: 'logged_out' });
          this.logger.warn(`Device ${deviceId} logged out - session cleared for reconnection`);
        } else if (shouldReconnect) {
          await this.updateDeviceStatus(deviceId, DeviceStatus.INITIALIZING);
          const reconnectPromise = new Promise<void>((resolve) => {
            const timer = setTimeout(async () => {
              this.reconnectTimers.delete(deviceId);
              this.logger.log(`Reconnecting device ${deviceId}...`);
              await this.connect(deviceId).catch((err) =>
                this.logger.error(`Reconnect failed for ${deviceId}: ${err.message}`),
              );
              resolve();
            }, 5000);
            this.reconnectTimers.set(deviceId, timer);
          });
          this.connectingPromises.set(deviceId, reconnectPromise);
        }
      }
    });

    (socket.ev as any).on('chats.phoneNumberShare', (entry: { lid: string; jid: string }) => {
      if (!this.lidPhoneMap.has(deviceId)) this.lidPhoneMap.set(deviceId, new Map());
      const deviceMap = this.lidPhoneMap.get(deviceId)!;
      if (entry.lid && entry.jid) {
        deviceMap.set(entry.lid, entry.jid);
        this.logger.log(`[LID] Mapped ${entry.lid} → ${entry.jid}`);
      }
    });

    socket.ev.on('contacts.upsert', (contacts) => {
      if (!this.lidPhoneMap.has(deviceId)) this.lidPhoneMap.set(deviceId, new Map());
      const deviceMap = this.lidPhoneMap.get(deviceId)!;
      for (const contact of contacts) {
        const lid = (contact as any).lid;
        const pnJid = (contact as any).pnJid || contact.id;
        if (lid && pnJid && !pnJid.endsWith('@lid')) {
          deviceMap.set(lid, pnJid);
          this.logger.log(`[LID] Contact mapped ${lid} → ${pnJid}`);
        }
      }
    });

    socket.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;
      for (const msg of messages) {
        if (!msg.message || msg.key.fromMe) continue;
        const remoteJid = msg.key?.remoteJid || '';
        if (remoteJid === 'status@broadcast' || remoteJid.endsWith('@newsletter')) continue;
        try {
          await this.handleIncomingMessage(deviceId, msg);
        } catch (err) {
          this.logger.error(`Error handling incoming message: ${err.message}`);
        }
      }
    });

    socket.ev.on('messages.update', async (updates) => {
      for (const update of updates) {
        const status = update.update.status;
        if (status !== undefined) {
          if (status === proto.WebMessageInfo.Status.ERROR) {
            const params = update.update.messageStubParameters || [];
            const is463 = params.some((p) => p === '463');
            const reason = is463 ? 'error_463_reach_out_time_lock' : `error_status_${status}`;
            this.logger.warn(`[messages.update] ERROR status for ${update.key.id} - reason: ${reason}`);
            this.eventEmitter.emit('message.failed', {
              deviceId,
              whatsappMessageId: update.key.id,
              reason,
            });
          } else {
            this.eventEmitter.emit('message.status', {
              deviceId,
              whatsappMessageId: update.key.id,
              status,
            });
          }
        }
      }
    });

    socket.ev.on('message-receipt.update', async (receipts) => {
      for (const receipt of receipts) {
        const errorCode = (receipt.receipt as any)?.errorCode;
        if (errorCode === 463) {
          this.logger.warn(`[463] Reach-out time-lock for message ${receipt.key.id} to ${receipt.key.remoteJid}`);
          this.eventEmitter.emit('message.failed', {
            deviceId,
            whatsappMessageId: receipt.key.id,
            reason: 'error_463_reach_out_time_lock',
          });
        }
      }
    });
    } catch (error: any) {
      this.logger.error(`Failed to connect device ${deviceId}: ${error.message}`);
      this.sockets.delete(deviceId);
      throw error;
    }
  }

  async disconnect(deviceId: string): Promise<void> {
    const engine = await this.getDeviceEngine(deviceId);

    if (engine === WhatsAppEngine.WWEBJS) {
      await this.wwebjsEngine.disconnect(deviceId);
      await this.updateDeviceStatus(deviceId, DeviceStatus.DISCONNECTED);
      return;
    }

    const socket = this.sockets.get(deviceId);
    if (socket) {
      try {
        await socket.logout();
      } catch {}
      this.sockets.delete(deviceId);
    }

    const timer = this.reconnectTimers.get(deviceId);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(deviceId);
    }

    await this.updateDeviceStatus(deviceId, DeviceStatus.DISCONNECTED);
  }

  async deleteSession(deviceId: string): Promise<void> {
    await this.disconnect(deviceId);
    const sessionPath = this.getSessionPath(deviceId);
    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true });
    }
  }

  getQrCode(deviceId: string): string | null {
    const wwQR = this.wwebjsEngine.getQR(deviceId);
    if (wwQR) return wwQR;
    return this.qrCodes.get(deviceId) || null;
  }

  async checkNumber(deviceId: string, phone: string): Promise<{ exists: boolean; jid: string | null }> {
    const engine = await this.getDeviceEngine(deviceId);
    if (engine === WhatsAppEngine.WWEBJS) {
      const exists = await this.wwebjsEngine.checkNumber(deviceId, phone);
      return { exists, jid: exists ? `${phone}@c.us` : null };
    }
    const socket = this.getSocket(deviceId);
    const jid = `${phone}@s.whatsapp.net`;
    try {
      const results = await socket.onWhatsApp(jid);
      const result = results?.[0];
      return { exists: result?.exists === true, jid: (result?.jid as string) ?? null };
    } catch {
      return { exists: false, jid: null };
    }
  }

  isConnected(deviceId: string): boolean {
    if (this.wwebjsEngine.isConnected(deviceId)) return true;
    const socket = this.sockets.get(deviceId);
    if (!socket) return false;
    try {
      return socket.ws?.isOpen === true && socket.user !== null;
    } catch {
      return false;
    }
  }

  private async resolveSendJid(deviceId: string, phone: string, isGroup: boolean): Promise<string> {
    if (phone.includes('@')) return phone;
    if (isGroup) return `${phone}@g.us`;

    const pnJid = `${phone}@s.whatsapp.net`;

    try {
      const socket = this.sockets.get(deviceId);
      if (socket) {
        const lid = await (socket as any).signalRepository?.lidMapping?.getLIDForPN(pnJid);
        if (lid) {
          this.logger.log(`[resolveSendJid] Baileys LID: ${phone} → ${lid}`);
          return lid;
        }
      }
    } catch (err) {
      this.logger.warn(`[resolveSendJid] LID lookup failed: ${err.message}, falling back to @s.whatsapp.net`);
    }

    return pnJid;
  }

  async sendText(deviceId: string, options: SendTextOptions): Promise<string> {
    const engine = await this.getDeviceEngine(deviceId);
    if (engine === WhatsAppEngine.WWEBJS) {
      return this.wwebjsEngine.sendText(deviceId, options);
    }
    const socket = this.getSocket(deviceId);
    const jid = await this.resolveSendJid(deviceId, options.phone, options.isGroup ?? false);

    this.logger.log(`[sendText] Phone: ${options.phone} → JID: ${jid}`);
    try {
      const result = await socket.sendMessage(jid, { text: options.message });
      this.logger.log(`[sendText] Success! Message ID: ${result?.key?.id}`);
      return result?.key?.id || '';
    } catch (err) {
      this.logger.error(`[sendText] FAILED: ${err.message}`);
      throw err;
    }
  }

  async sendImage(deviceId: string, options: SendMediaOptions): Promise<string> {
    const engine = await this.getDeviceEngine(deviceId);
    if (engine === WhatsAppEngine.WWEBJS) return this.wwebjsEngine.sendImage(deviceId, options);
    const socket = this.getSocket(deviceId);
    const jid = await this.resolveSendJid(deviceId, options.phone, options.isGroup ?? false);

    const result = await socket.sendMessage(jid, {
      image: { url: options.mediaUrl },
      caption: options.caption || '',
    });
    return result?.key?.id || '';
  }

  async sendDocument(deviceId: string, options: SendMediaOptions): Promise<string> {
    const engine = await this.getDeviceEngine(deviceId);
    if (engine === WhatsAppEngine.WWEBJS) return this.wwebjsEngine.sendDocument(deviceId, options);
    const socket = this.getSocket(deviceId);
    const jid = await this.resolveSendJid(deviceId, options.phone, options.isGroup ?? false);

    const result = await socket.sendMessage(jid, {
      document: { url: options.mediaUrl },
      mimetype: 'application/octet-stream',
      fileName: options.filename || 'file',
      caption: options.caption || '',
    });
    return result?.key?.id || '';
  }

  async sendVideo(deviceId: string, options: SendMediaOptions): Promise<string> {
    const engine = await this.getDeviceEngine(deviceId);
    if (engine === WhatsAppEngine.WWEBJS) return this.wwebjsEngine.sendVideo(deviceId, options);
    const socket = this.getSocket(deviceId);
    const jid = await this.resolveSendJid(deviceId, options.phone, options.isGroup ?? false);

    const result = await socket.sendMessage(jid, {
      video: { url: options.mediaUrl },
      caption: options.caption || '',
    });
    return result?.key?.id || '';
  }

  async sendAudio(deviceId: string, options: SendMediaOptions): Promise<string> {
    const engine = await this.getDeviceEngine(deviceId);
    if (engine === WhatsAppEngine.WWEBJS) return this.wwebjsEngine.sendAudio(deviceId, options);
    const socket = this.getSocket(deviceId);
    const jid = await this.resolveSendJid(deviceId, options.phone, options.isGroup ?? false);

    const result = await socket.sendMessage(jid, {
      audio: { url: options.mediaUrl },
      mimetype: 'audio/mpeg',
    });
    return result?.key?.id || '';
  }

  async sendTyping(deviceId: string, phone: string, durationMs: number, isGroup = false): Promise<void> {
    const engine = await this.getDeviceEngine(deviceId);
    if (engine === WhatsAppEngine.WWEBJS) {
      await this.wwebjsEngine.sendTyping(deviceId, phone, durationMs, isGroup);
      return;
    }
    const socket = this.sockets.get(deviceId);
    if (!socket) return;
    const jid = phone.includes('@') ? phone : isGroup ? `${phone}@g.us` : `${phone}@s.whatsapp.net`;
    if (jid.endsWith('@lid')) return;
    try {
      await socket.sendPresenceUpdate('composing', jid);
      await new Promise((resolve) => setTimeout(resolve, durationMs));
      await socket.sendPresenceUpdate('paused', jid);
    } catch {}
  }

  async markAsRead(deviceId: string, phone: string, messageId: string): Promise<void> {
    const socket = this.sockets.get(deviceId);
    if (!socket) return;
    const jid = phone.includes('@') ? phone : `${phone}@s.whatsapp.net`;
    if (jid.endsWith('@lid')) return;
    try {
      await socket.readMessages([
        { id: messageId, fromMe: false, remoteJid: jid },
      ]);
    } catch {}
  }

  resolvePhoneFromLid(deviceId: string, lidOrPhone: string): string {
    if (!lidOrPhone.endsWith('@lid')) return lidOrPhone;
    const resolved = this.lidPhoneMap.get(deviceId)?.get(lidOrPhone);
    if (resolved) {
      return resolved.replace(/@s\.whatsapp\.net$/, '');
    }
    return lidOrPhone;
  }

  async waitUntilConnected(deviceId: string, timeoutMs = 12000): Promise<void> {
    const pending = this.connectingPromises.get(deviceId);
    if (pending) {
      await Promise.race([
        pending,
        new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error(`Device ${deviceId} reconnect timed out`)), timeoutMs),
        ),
      ]);
    }
  }

  private getSocket(deviceId: string): WASocket {
    const socket = this.sockets.get(deviceId);
    if (!socket) {
      throw new Error(`Device ${deviceId} is not connected`);
    }
    if (!this.isConnected(deviceId)) {
      throw new Error(`Device ${deviceId} is not connected`);
    }
    return socket;
  }

  @OnEvent('wwebjs.connected')
  async handleWWebjsConnected(payload: { deviceId: string; phone: string }): Promise<void> {
    await this.deviceRepo.update({ deviceId: payload.deviceId }, {
      status: DeviceStatus.CONNECTED,
      phone: payload.phone,
    });
    this.logger.log(`[WWebJS] DB updated: device ${payload.deviceId} CONNECTED (${payload.phone})`);
    this.eventEmitter.emit('device.connected', payload);
    this.eventEmitter.emit('device.status', { deviceId: payload.deviceId, status: 'connected' });
  }

  @OnEvent('wwebjs.status')
  async handleWWebjsStatus(payload: { deviceId: string; status: string }): Promise<void> {
    if (payload.status === 'disconnected') {
      await this.deviceRepo.update({ deviceId: payload.deviceId }, { status: DeviceStatus.DISCONNECTED });
      this.logger.log(`[WWebJS] DB updated: device ${payload.deviceId} DISCONNECTED`);
      this.eventEmitter.emit('device.disconnected', { deviceId: payload.deviceId, reason: 'disconnected' });
      this.eventEmitter.emit('device.status', { deviceId: payload.deviceId, status: 'disconnected' });
    }
  }

  private async updateDeviceStatus(deviceId: string, status: DeviceStatus): Promise<void> {
    await this.deviceRepo.update({ deviceId }, { status });
    this.eventEmitter.emit('device.status', { deviceId, status });
  }

  private async handleIncomingMessage(deviceId: string, msg: proto.IWebMessageInfo): Promise<void> {
    const jid = msg.key?.remoteJid || '';
    if (jid === 'status@broadcast' || jid.endsWith('@newsletter')) return;
    const isGroup = jid.endsWith('@g.us');
    const isLid = !isGroup && jid.endsWith('@lid');

    // For LID contacts: senderPn is the real phone number (from Baileys key)
    // Signal session keys are bound to @lid, so we must send replies back to @lid
    // Store LID→PN mapping for display/lookup, but use @lid as the send target
    const senderPn: string | undefined = (msg.key as any).senderPn;

    if (isLid && senderPn) {
      if (!this.lidPhoneMap.has(deviceId)) this.lidPhoneMap.set(deviceId, new Map());
      this.lidPhoneMap.get(deviceId)!.set(jid, senderPn);
      this.logger.log(`[LID] Mapped from incoming: ${jid} → ${senderPn}`);
    }

    let phone: string;
    if (isGroup) {
      const participant = (msg.key as any)?.participantPn || (msg.key as any)?.participantAlt || msg.key?.participant || '';
      phone = participant.replace(/@(s\.whatsapp\.net|lid)$/, '');
    } else if (isLid) {
      // Use @lid JID as phone identifier — replies must go to @lid for Signal session to work
      phone = jid;
    } else {
      phone = jid.replace(/@s\.whatsapp\.net$/, '');
    }

    this.logger.log(`[INCOMING] JID: ${jid}, senderPn: ${senderPn || 'none'}, phone: ${phone}, isLid: ${isLid}`);

    const groupId = isGroup ? jid.replace(/@g\.us$/, '') : undefined;

    const msgContent = msg.message;
    let type = 'text';
    let messageText = '';
    let mediaMimeType: string | undefined;

    if (msgContent?.conversation) {
      messageText = msgContent.conversation;
    } else if (msgContent?.extendedTextMessage?.text) {
      messageText = msgContent.extendedTextMessage.text;
    } else if (msgContent?.imageMessage) {
      type = 'image';
      messageText = msgContent.imageMessage.caption || '';
      mediaMimeType = msgContent.imageMessage.mimetype || 'image/jpeg';
    } else if (msgContent?.documentMessage) {
      type = 'document';
      messageText = msgContent.documentMessage.fileName || msgContent.documentMessage.title || '';
      mediaMimeType = msgContent.documentMessage.mimetype || 'application/octet-stream';
    } else if (msgContent?.videoMessage) {
      type = 'video';
      messageText = msgContent.videoMessage.caption || '';
      mediaMimeType = msgContent.videoMessage.mimetype || 'video/mp4';
    } else if (msgContent?.audioMessage) {
      type = 'audio';
      mediaMimeType = msgContent.audioMessage.mimetype || 'audio/ogg';
    }

    const pushName = msg.pushName || phone;

    // Download media if present
    let mediaUrl: string | undefined;
    if (mediaMimeType) {
      const socket = this.sockets.get(deviceId);
      if (socket) {
        try {
          const { downloadMediaMessage } = await import('@whiskeysockets/baileys');
          const buffer = await downloadMediaMessage(msg as any, 'buffer', {}) as Buffer;
          const saved = await this.mediaService.saveBuffer(buffer, mediaMimeType, messageText || undefined);
          mediaUrl = saved.url;
          this.logger.log(`[MEDIA] Downloaded and saved incoming media: ${saved.filename}`);
        } catch (err) {
          this.logger.warn(`[MEDIA] Failed to download incoming media: ${err.message}`);
        }
      }
    }

    this.logger.log(`[INCOMING] Original JID: ${jid}`);
    this.logger.log(`[INCOMING] Extracted phone: ${phone}`);
    this.logger.log(`[INCOMING] isLid: ${isLid}, isGroup: ${isGroup}`);

    const incoming: WhatsAppMessage = {
      deviceId,
      phone,
      senderPn: isLid ? senderPn?.replace(/@s\.whatsapp\.net$/, '') : undefined,
      senderName: pushName,
      message: messageText,
      type,
      isGroup,
      groupId,
      mediaUrl,
      whatsappMessageId: msg.key?.id || '',
      timestamp: (msg.messageTimestamp as number) || Date.now(),
    };

    // Store to chat history
    try {
      await this.chatHistoryService.storeMessage(deviceId, msg, MessageDirection.INCOMING);
      this.logger.debug(`[CHAT_HISTORY] Stored incoming message from ${phone}`);
    } catch (err) {
      this.logger.error(`[CHAT_HISTORY] Failed to store message: ${err.message}`);
    }

    this.eventEmitter.emit('message.incoming', incoming);
  }
}
