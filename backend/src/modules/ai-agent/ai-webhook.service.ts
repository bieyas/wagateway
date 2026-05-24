import { Injectable, Logger } from '@nestjs/common';
import { WhatsAppMessage } from '../../whatsapp/whatsapp.service';
import { Device } from '../devices/entities/device.entity';

@Injectable()
export class AiWebhookService {
  private readonly logger = new Logger(AiWebhookService.name);

  async forwardIncomingWebhook(device: Device, payload: WhatsAppMessage): Promise<void> {
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

  async notifyHandoff(webhookUrl: string, payload: WhatsAppMessage, conversationId: string): Promise<void> {
    try {
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
    } catch (err) {
      this.logger.warn(`[WEBHOOK] Failed to notify handoff to ${webhookUrl}: ${err.message}`);
    }
  }

  async forwardMessageStatus(trackingUrl: string, payload: { deviceId: string; whatsappMessageId: string; status: number }): Promise<void> {
    try {
      const axios = await import('axios');
      // Wablas-compatible status mapping: 1=pending,2=server,3=delivered,4=read,5=played
      await axios.default.post(trackingUrl, {
        id: payload.whatsappMessageId,
        deviceId: payload.deviceId,
        status: payload.status,
        timestamp: new Date().toISOString(),
      }, { timeout: 5000, headers: { 'Content-Type': 'application/json' } });
    } catch (err) {
      this.logger.warn(`[WEBHOOK] Failed to forward message status to ${trackingUrl}: ${err.message}`);
    }
  }
}
