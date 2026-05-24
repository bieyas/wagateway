import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MessageQueue, QueueStatus } from './entities/message-queue.entity';
import { WhatsAppService } from '../../whatsapp/whatsapp.service';
import { ConversationsService } from '../conversations/conversations.service';
import { MessageRole } from '../conversations/entities/conversation-message.entity';
import { DevicesService } from '../devices/devices.service';
import { v4 as uuidv4 } from 'uuid';

export interface EnqueueItem {
  phone: string;
  type?: string;
  message?: string;
  mediaUrl?: string;
  caption?: string;
  filename?: string;
  isGroup?: boolean;
}

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);
  private processing = new Set<string>();

  constructor(
    @InjectRepository(MessageQueue)
    private readonly queueRepo: Repository<MessageQueue>,
    private readonly whatsappService: WhatsAppService,
    private readonly conversationsService: ConversationsService,
    @Inject(forwardRef(() => DevicesService)) private readonly devicesService: DevicesService,
  ) {}

  async enqueue(deviceId: string, items: EnqueueItem[]): Promise<{ batchId: string; jobIds: string[] }> {
    const batchId = uuidv4();
    const entities = items.map(item => {
      const q = new MessageQueue();
      q.deviceId = deviceId;
      q.phone = item.phone;
      q.type = item.type || 'text';
      q.message = item.message ?? null;
      q.mediaUrl = item.mediaUrl ?? null;
      q.caption = item.caption ?? null;
      q.filename = item.filename ?? null;
      q.isGroup = item.isGroup ?? false;
      q.status = QueueStatus.PENDING;
      q.batchId = batchId;
      return q;
    });
    const saved = await this.queueRepo.save(entities);
    this.logger.log(`[QUEUE] Enqueued ${saved.length} messages for device ${deviceId}, batch ${batchId}`);
    return { batchId, jobIds: saved.map(e => e.id) };
  }

  async getJobStatus(jobId: string): Promise<MessageQueue | null> {
    return this.queueRepo.findOne({ where: { id: jobId } });
  }

  async getBatchStatus(batchId: string): Promise<{
    batchId: string;
    total: number;
    pending: number;
    processing: number;
    sent: number;
    failed: number;
    jobs: MessageQueue[];
  }> {
    const jobs = await this.queueRepo.find({ where: { batchId }, order: { createdAt: 'ASC' } });
    return {
      batchId,
      total: jobs.length,
      pending: jobs.filter(j => j.status === QueueStatus.PENDING).length,
      processing: jobs.filter(j => j.status === QueueStatus.PROCESSING).length,
      sent: jobs.filter(j => j.status === QueueStatus.SENT).length,
      failed: jobs.filter(j => j.status === QueueStatus.FAILED).length,
      jobs,
    };
  }

  async getDeviceQueue(deviceId: string, limit = 50): Promise<MessageQueue[]> {
    return this.queueRepo.find({
      where: { deviceId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  @Cron(CronExpression.EVERY_5_SECONDS)
  async processPendingJobs(): Promise<void> {
    const devices = await this.queueRepo
      .createQueryBuilder('q')
      .select('DISTINCT q."deviceId"', 'deviceId')
      .where('q.status = :status', { status: QueueStatus.PENDING })
      .getRawMany();

    for (const { deviceId } of devices) {
      if (this.processing.has(deviceId)) continue;
      this.processDeviceQueue(deviceId).catch(err =>
        this.logger.error(`[QUEUE] Error processing device ${deviceId}: ${err.message}`)
      );
    }
  }

  private async processDeviceQueue(deviceId: string): Promise<void> {
    this.processing.add(deviceId);
    try {
      let device: any;
      try {
        device = await this.devicesService.findOne(deviceId);
      } catch {
        this.processing.delete(deviceId);
        return;
      }
      const delayMs = device.messageDelay ?? 1000;
      const MAX_JOBS_PER_CYCLE = 500;
      let processed = 0;

      while (processed < MAX_JOBS_PER_CYCLE) {
        const job = await this.queueRepo.findOne({
          where: { deviceId, status: QueueStatus.PENDING },
          order: { createdAt: 'ASC' },
        });
        if (!job) break;
        processed++;

        await this.queueRepo.update(job.id, { status: QueueStatus.PROCESSING });

        try {
          await this.whatsappService.waitUntilConnected(deviceId, 15000);
          const phone = job.phone;
          const type = job.type || 'text';
          let msgId: string;

          if (type === 'image' && job.mediaUrl) {
            msgId = await this.whatsappService.sendImage(deviceId, { phone, mediaUrl: job.mediaUrl, caption: job.caption || job.message || '', isGroup: job.isGroup, type: 'image' });
          } else if (type === 'video' && job.mediaUrl) {
            msgId = await this.whatsappService.sendVideo(deviceId, { phone, mediaUrl: job.mediaUrl, caption: job.caption || job.message || '', isGroup: job.isGroup, type: 'video' });
          } else if (type === 'audio' && job.mediaUrl) {
            msgId = await this.whatsappService.sendAudio(deviceId, { phone, mediaUrl: job.mediaUrl, isGroup: job.isGroup, type: 'audio' });
          } else if (type === 'document' && job.mediaUrl) {
            msgId = await this.whatsappService.sendDocument(deviceId, { phone, mediaUrl: job.mediaUrl, caption: job.caption || job.message || '', filename: job.filename ?? undefined, isGroup: job.isGroup, type: 'document' });
          } else {
            msgId = await this.whatsappService.sendText(deviceId, { phone, message: job.message || '', isGroup: job.isGroup });
          }

          await this.queueRepo.update(job.id, {
            status: QueueStatus.SENT,
            processedAt: new Date(),
            error: null,
          });
          this.logger.log(`[QUEUE] Sent job ${job.id} to ${phone} (msgId: ${msgId})`);

          try {
            const conv = await this.conversationsService.findOrCreate(deviceId, phone);
            const content = job.caption || job.message || '';
            await this.conversationsService.addMessage(conv.id, MessageRole.ASSISTANT, content, 0, 'webhook',
              type !== 'text' ? (job.mediaUrl ?? undefined) : undefined, type !== 'text' ? (type ?? undefined) : 'text');
          } catch { /* non-critical */ }

        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          const isDetachedFrame = message.toLowerCase().includes('detached frame');
          const retryCount = (job.retryCount || 0) + 1;
          const maxRetries = 3;
          if (isDetachedFrame) {
            await this.queueRepo.update(job.id, {
              status: QueueStatus.PENDING,
              error: message,
              retryCount,
            });
            this.logger.warn(`[QUEUE] Detached frame on job ${job.id}; recovering connection before retry`);
            await this.whatsappService.recoverConnection(deviceId).catch(recoverErr =>
              this.logger.warn(`[QUEUE] Recovery failed for ${deviceId}: ${recoverErr.message}`),
            );
            break;
          }
          if (retryCount >= maxRetries) {
            await this.queueRepo.update(job.id, {
              status: QueueStatus.FAILED,
              error: message,
              retryCount,
              processedAt: new Date(),
            });
            this.logger.warn(`[QUEUE] Job ${job.id} failed permanently after ${retryCount} retries: ${message}`);
          } else {
            await this.queueRepo.update(job.id, {
              status: QueueStatus.PENDING,
              error: message,
              retryCount,
            });
            this.logger.warn(`[QUEUE] Job ${job.id} retry ${retryCount}/${maxRetries}: ${message}`);
          }
        }

        if (delayMs > 0) {
          await new Promise(r => setTimeout(r, delayMs));
        }
      }
    } finally {
      this.processing.delete(deviceId);
    }
  }

  async retryFailed(deviceId: string, batchId?: string): Promise<number> {
    const where: any = { deviceId, status: QueueStatus.FAILED };
    if (batchId) where.batchId = batchId;
    const result = await this.queueRepo.update(where, { status: QueueStatus.PENDING, error: null, retryCount: 0 });
    return result.affected || 0;
  }

  @Cron(CronExpression.EVERY_HOUR)
  async clearOldJobs(olderThanHours = 24): Promise<number> {
    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    const result = await this.queueRepo
      .createQueryBuilder()
      .delete()
      .where('status IN (:...statuses)', { statuses: [QueueStatus.SENT, QueueStatus.FAILED] })
      .andWhere('"createdAt" < :cutoff', { cutoff })
      .execute();
    const deleted = result.affected || 0;
    if (deleted > 0) this.logger.log(`[QUEUE] Cleared ${deleted} old job(s) older than ${olderThanHours}h`);
    return deleted;
  }
}
