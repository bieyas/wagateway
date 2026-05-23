import { Entity, Column, OneToMany, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Organization } from '../../auth/entities/organization.entity';
import { ConversationMessage } from './conversation-message.entity';

export enum ConversationStatus {
  ACTIVE = 'active',
  CLOSED = 'closed',
  ESCALATED = 'escalated',
  HUMAN_TAKEOVER = 'human_takeover',
}

@Entity('conversations')
@Index(['deviceId', 'phone'], { unique: true })
export class Conversation extends BaseEntity {
  @Column()
  @Index()
  deviceId: string;

  @Column({ nullable: true })
  organizationId: string;

  @ManyToOne(() => Organization, { nullable: true, onDelete: 'SET NULL', eager: false })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column()
  phone: string;

  @Column({ nullable: true })
  contactName: string;

  @Column({ type: 'enum', enum: ConversationStatus, default: ConversationStatus.ACTIVE })
  status: ConversationStatus;

  @Column({ type: 'text', nullable: true })
  summary: string;

  @Column({ nullable: true })
  lastMessageAt: Date;

  @Column({ default: 0 })
  messageCount: number;

  @Column({ default: 0 })
  totalTokensUsed: number;

  @Column({ type: 'text', nullable: true })
  metadata: string;

  @OneToMany(() => ConversationMessage, (msg) => msg.conversation, { cascade: true })
  messages: ConversationMessage[];
}
