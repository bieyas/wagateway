import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

export enum QueueStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SENT = 'sent',
  FAILED = 'failed',
}

@Entity('message_queue')
@Index(['deviceId', 'status'])
export class MessageQueue extends BaseEntity {
  @Column()
  @Index()
  deviceId: string;

  @Column()
  phone: string;

  @Column({ default: 'text' })
  type: string;

  @Column({ type: 'text', nullable: true })
  message: string | null;

  @Column({ type: 'varchar', nullable: true })
  mediaUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  caption: string | null;

  @Column({ type: 'varchar', nullable: true })
  filename: string | null;

  @Column({ default: false })
  isGroup: boolean;

  @Column({ type: 'enum', enum: QueueStatus, default: QueueStatus.PENDING })
  status: QueueStatus;

  @Column({ default: 0 })
  retryCount: number;

  @Column({ type: 'text', nullable: true })
  error: string | null;

  @Column({ type: 'timestamp', nullable: true })
  processedAt: Date | null;

  @Column({ type: 'varchar', nullable: true })
  batchId: string | null;
}
