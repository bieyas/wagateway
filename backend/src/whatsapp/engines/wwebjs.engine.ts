import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import { IWhatsAppEngine, SendTextOptions, SendMediaOptions } from './whatsapp-engine.interface';
import { MediaService } from '../../modules/media/media.service';

@Injectable()
export class WWebJSEngine implements IWhatsAppEngine {
  private readonly logger = new Logger(WWebJSEngine.name);
  private clients = new Map<string, Client>();
  private qrCodes = new Map<string, string>();
  private readyStates = new Map<string, boolean>();

  private readonly CHROMIUM_PATH = '/usr/bin/chromium-browser';
  private readonly SESSION_BASE = process.env.SESSION_PATH || './sessions';

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly mediaService: MediaService,
  ) {}

  async connect(deviceId: string): Promise<void> {
    const stale = this.clients.get(deviceId);
    if (stale) {
      this.logger.warn(`[WWebJS] Stale client found for ${deviceId}, destroying before re-init`);
      try { await stale.destroy(); } catch { /* ignore */ }
      this.clients.delete(deviceId);
      this.readyStates.set(deviceId, false);
      this.qrCodes.delete(deviceId);
    }

    this.logger.log(`[WWebJS] Initializing client for ${deviceId}`);

    const client = new Client({
      authStrategy: new LocalAuth({
        clientId: deviceId,
        dataPath: `${this.SESSION_BASE}/wwebjs`,
      }),
      puppeteer: {
        executablePath: this.CHROMIUM_PATH,
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
        ],
      },
    });

    this.clients.set(deviceId, client);
    this.readyStates.set(deviceId, false);

    client.on('qr', (qr) => {
      this.logger.log(`[WWebJS] QR received for ${deviceId}`);
      this.qrCodes.set(deviceId, qr);
      this.eventEmitter.emit('device.qr', { deviceId, qr });
      this.eventEmitter.emit('device.status', { deviceId, status: 'scan_qr' });
    });

    client.on('ready', () => {
      this.logger.log(`[WWebJS] Client ${deviceId} READY`);
      this.readyStates.set(deviceId, true);
      this.qrCodes.delete(deviceId);
      const phone = client.info?.wid?.user || '';
      this.eventEmitter.emit('wwebjs.connected', { deviceId, phone });
    });

    client.on('authenticated', () => {
      this.logger.log(`[WWebJS] Client ${deviceId} authenticated`);
    });

    client.on('auth_failure', (msg) => {
      this.logger.error(`[WWebJS] Auth failure for ${deviceId}: ${msg}`);
      this.readyStates.set(deviceId, false);
      this.eventEmitter.emit('wwebjs.status', { deviceId, status: 'disconnected' });
    });

    client.on('disconnected', (reason) => {
      this.logger.warn(`[WWebJS] Client ${deviceId} disconnected: ${reason}`);
      this.readyStates.set(deviceId, false);
      this.clients.delete(deviceId);
      this.eventEmitter.emit('wwebjs.status', { deviceId, status: 'disconnected' });
    });

    client.on('message', async (msg) => {
      try {
        if (msg.fromMe) return;
        if (msg.from === 'status@broadcast' || msg.from.endsWith('@newsletter')) return;
        const contact = await msg.getContact();
        const isLid = msg.from.endsWith('@lid');
        const isGroup = msg.from.endsWith('@g.us');
        const phone = msg.from.replace(/@(c\.us|lid|g\.us)$/, '');

        // For LID contacts: real phone is in contact.id.user (e.g. "6281228240369@c.us" → "6281228240369")
        // contact.number for LID contacts returns the LID itself, not the phone number
        const senderPn = isLid && (contact as any).id?.user
          ? String((contact as any).id.user).replace(/@(c\.us|s\.whatsapp\.net)$/, '')
          : undefined;


        const msgType = msg.type === 'chat' ? 'text' : msg.type;
        const isMedia = msg.hasMedia && ['image', 'video', 'audio', 'document', 'ptt'].includes(msg.type);

        let groupName: string | undefined;
        let mentionedIds: string[] = [];
        if (isGroup) {
          try {
            const chat = await msg.getChat();
            groupName = chat.name;
          } catch (_) {}
          try {
            mentionedIds = (await msg.getMentions()).map((c: any) => c.id?.user || c.id?._serialized || '').filter(Boolean);
          } catch (_) {}
        }

        let mediaUrl: string | undefined;
        if (isMedia) {
          try {
            const media = await msg.downloadMedia();
            if (media?.data) {
              const buffer = Buffer.from(media.data, 'base64');
              const mimeType = media.mimetype || 'application/octet-stream';
              const saved = await this.mediaService.saveBuffer(buffer, mimeType, media.filename || undefined);
              mediaUrl = saved.url;
              this.logger.log(`[WWebJS][MEDIA] Saved incoming media: ${saved.filename}`);
            }
          } catch (err) {
            this.logger.warn(`[WWebJS][MEDIA] Failed to download media: ${err.message}`);
          }
        }

        // If LID contact has a real phone number, emit mapping for whitelist resolution
        if (isLid && senderPn && senderPn !== phone) {
          this.eventEmitter.emit('lid.mapping', { deviceId, lid: phone, phoneNumber: senderPn });
        }

        this.eventEmitter.emit('message.incoming', {
          deviceId,
          phone: isLid ? msg.from : phone,
          senderPn,
          senderName: contact.pushname || contact.name || phone,
          message: msg.body,
          type: msg.type === 'ptt' ? 'audio' : msgType,
          isGroup,
          groupId: isGroup ? phone : undefined,
          groupName,
          mentionedIds,
          mediaUrl,
          whatsappMessageId: msg.id._serialized,
          timestamp: msg.timestamp,
        });
      } catch (err) {
        this.logger.error(`[WWebJS] Error handling incoming message: ${err.message}`);
      }
    });

    client.on('message_ack', (msg, ack) => {
      this.eventEmitter.emit('message.status', {
        deviceId,
        whatsappMessageId: msg.id._serialized,
        status: ack,
      });
    });

    try {
      await client.initialize();
    } catch (err) {
      this.logger.error(`[WWebJS] initialize() failed for ${deviceId}: ${err.message}`);
      try { await client.destroy(); } catch { /* ignore */ }
      this.clients.delete(deviceId);
      this.readyStates.set(deviceId, false);
      this.qrCodes.delete(deviceId);
      throw err;
    }
  }

  async disconnect(deviceId: string): Promise<void> {
    const client = this.clients.get(deviceId);
    if (!client) return;
    try {
      await client.destroy();
    } catch (err) {
      this.logger.warn(`[WWebJS] Error destroying client ${deviceId}: ${err.message}`);
    }
    this.clients.delete(deviceId);
    this.readyStates.set(deviceId, false);
    this.qrCodes.delete(deviceId);
  }

  isConnected(deviceId: string): boolean {
    return this.readyStates.get(deviceId) === true;
  }

  getQR(deviceId: string): string | null {
    return this.qrCodes.get(deviceId) || null;
  }

  async sendText(deviceId: string, options: SendTextOptions): Promise<string> {
    const client = this.getClient(deviceId);
    const jid = this.resolveJid(options.phone, options.isGroup ?? false);
    this.logger.log(`[WWebJS sendText] ${options.phone} → ${jid}`);
    const result = await client.sendMessage(jid, options.message);
    this.logger.log(`[WWebJS sendText] Success! ID: ${result.id._serialized}`);
    return result.id._serialized;
  }

  async sendImage(deviceId: string, options: SendMediaOptions): Promise<string> {
    const client = this.getClient(deviceId);
    const jid = this.resolveJid(options.phone, options.isGroup ?? false);
    const media = await MessageMedia.fromUrl(options.mediaUrl, { unsafeMime: true });
    const result = await client.sendMessage(jid, media, { caption: options.caption || '' });
    return result.id._serialized;
  }

  async sendDocument(deviceId: string, options: SendMediaOptions): Promise<string> {
    const client = this.getClient(deviceId);
    const jid = this.resolveJid(options.phone, options.isGroup ?? false);
    const media = await MessageMedia.fromUrl(options.mediaUrl, { unsafeMime: true });
    media.filename = options.filename || 'file';
    const result = await client.sendMessage(jid, media, { caption: options.caption || '', sendMediaAsDocument: true });
    return result.id._serialized;
  }

  async sendVideo(deviceId: string, options: SendMediaOptions): Promise<string> {
    const client = this.getClient(deviceId);
    const jid = this.resolveJid(options.phone, options.isGroup ?? false);
    const media = await MessageMedia.fromUrl(options.mediaUrl, { unsafeMime: true });
    const result = await client.sendMessage(jid, media, { caption: options.caption || '' });
    return result.id._serialized;
  }

  async sendAudio(deviceId: string, options: SendMediaOptions): Promise<string> {
    const client = this.getClient(deviceId);
    const jid = this.resolveJid(options.phone, options.isGroup ?? false);
    const media = await MessageMedia.fromUrl(options.mediaUrl, { unsafeMime: true });
    const result = await client.sendMessage(jid, media, { sendAudioAsVoice: true });
    return result.id._serialized;
  }

  async sendTyping(deviceId: string, phone: string, durationMs: number): Promise<void> {
    try {
      const client = this.getClient(deviceId);
      const jid = this.resolveJid(phone, false);
      const chat = await client.getChatById(jid);
      await chat.sendStateTyping();
      await new Promise((r) => setTimeout(r, durationMs));
      await chat.clearState();
    } catch (err) {
      this.logger.warn(`[WWebJS] sendTyping failed for ${phone}: ${err.message}`);
    }
  }

  async checkNumber(deviceId: string, phone: string): Promise<boolean> {
    const client = this.getClient(deviceId);
    const jid = this.resolveJid(phone, false);
    const result = await client.isRegisteredUser(jid);
    return result;
  }

  private getClient(deviceId: string): Client {
    const client = this.clients.get(deviceId);
    if (!client) throw new Error(`WWebJS client not found for device ${deviceId}`);
    return client;
  }

  private resolveJid(phone: string, isGroup: boolean): string {
    if (phone.includes('@')) return phone;
    if (isGroup) return `${phone}@g.us`;
    // LID numbers are 15+ digits and don't start with a country code pattern
    if (/^\d{15,}$/.test(phone)) return `${phone}@lid`;
    return `${phone}@c.us`;
  }
}
