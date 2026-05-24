import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('quick_replies')
@Index(['deviceId'])
export class QuickReply extends BaseEntity {
  @Column()
  @Index()
  deviceId: string;

  @Column()
  shortcut: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  @Column({ default: 0 })
  usageCount: number;
}
