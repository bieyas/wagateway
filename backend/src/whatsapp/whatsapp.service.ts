import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Device, DeviceStatus } from '../modules/devices/entities/device.entity';
import { WWebJSEngine } from './engines/wwebjs.engine';

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
  mediaUrl?: string;
  mentionedIds?: string[];
  whatsappMessageId: string;
  timestamp: number;
}

@Injectable()
export class WhatsAppService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(
    @InjectRepository(Device)
    private readonly deviceRepo: Repository<Device>,
    private readonly eventEmitter: EventEmitter2,
    private readonly wwebjsEngine: WWebJSEngine,
  ) {}

  // No-op: retained for API compatibility; engine is always WWebJS
  invalidateEngineCache(_deviceId: string): void {}

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
    await this.wwebjsEngine.disconnectAll();
  }

  async connect(deviceId: string): Promise<void> {
    this.logger.log(`[connect] Device ${deviceId} → WWebJS`);
    await this.wwebjsEngine.connect(deviceId);
  }

  async disconnect(deviceId: string): Promise<void> {
    await this.wwebjsEngine.disconnect(deviceId);
    await this.updateDeviceStatus(deviceId, DeviceStatus.DISCONNECTED);
  }

  async deleteSession(deviceId: string): Promise<void> {
    await this.wwebjsEngine.deleteSession(deviceId);
  }

  getQrCode(deviceId: string): string | null {
    return this.wwebjsEngine.getQR(deviceId) || null;
  }

  isConnected(deviceId: string): boolean {
    return this.wwebjsEngine.isConnected(deviceId);
  }

  async checkNumber(deviceId: string, phone: string): Promise<{ exists: boolean; jid: string | null }> {
    const exists = await this.wwebjsEngine.checkNumber(deviceId, phone);
    return { exists, jid: exists ? `${phone}@c.us` : null };
  }

  async getProfilePicUrl(deviceId: string, phone: string): Promise<string | null> {
    return this.wwebjsEngine.getProfilePicUrl(deviceId, phone);
  }

  async sendText(deviceId: string, options: SendTextOptions): Promise<string> {
    return this.wwebjsEngine.sendText(deviceId, options);
  }

  async sendImage(deviceId: string, options: SendMediaOptions): Promise<string> {
    return this.wwebjsEngine.sendImage(deviceId, options);
  }

  async sendDocument(deviceId: string, options: SendMediaOptions): Promise<string> {
    return this.wwebjsEngine.sendDocument(deviceId, options);
  }

  async sendVideo(deviceId: string, options: SendMediaOptions): Promise<string> {
    return this.wwebjsEngine.sendVideo(deviceId, options);
  }

  async sendAudio(deviceId: string, options: SendMediaOptions): Promise<string> {
    return this.wwebjsEngine.sendAudio(deviceId, options);
  }

  async sendTyping(deviceId: string, phone: string, durationMs: number, isGroup = false): Promise<void> {
    await this.wwebjsEngine.sendTyping(deviceId, phone, durationMs, isGroup);
  }

  async markAsRead(deviceId: string, phone: string, messageId: string): Promise<void> {
    await this.wwebjsEngine.markAsRead(deviceId, phone, messageId);
  }

  resolvePhoneFromLid(_deviceId: string, lidOrPhone: string): string {
    return lidOrPhone;
  }

  async waitUntilConnected(deviceId: string, timeoutMs = 12000): Promise<void> {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      if (this.isConnected(deviceId)) return;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    throw new Error(`Device ${deviceId} is not connected`);
  }

  async recoverConnection(deviceId: string): Promise<void> {
    this.logger.warn(`[recover] Restarting WWebJS client for ${deviceId}`);
    await this.wwebjsEngine.disconnect(deviceId).catch((err) =>
      this.logger.warn(`[recover] disconnect failed for ${deviceId}: ${err.message}`),
    );
    await this.connect(deviceId);
    await this.waitUntilConnected(deviceId, 30000);
  }

  @OnEvent('wwebjs.connected')
  async handleWWebjsConnected(payload: { deviceId: string; phone: string; selfLid?: string }): Promise<void> {
    await this.deviceRepo.update({ deviceId: payload.deviceId }, {
      status: DeviceStatus.CONNECTED,
      phone: payload.phone,
      ...(payload.selfLid ? { selfLid: payload.selfLid } : {}),
    });
    this.logger.log(`[WWebJS] DB updated: device ${payload.deviceId} CONNECTED (${payload.phone}, lid=${payload.selfLid || 'n/a'})`);
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
}
