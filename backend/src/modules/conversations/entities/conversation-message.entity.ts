import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Conversation } from './conversation.entity';

export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
}

@Entity('conversation_messages')
@Index(['conversationId', 'createdAt'])
export class ConversationMessage extends BaseEntity {
  @Column()
  @Index()
  conversationId: string;

  @Column({ type: 'enum', enum: MessageRole })
  role: MessageRole;

  @Column({ type: 'varchar', nullable: true })
  senderName: string | null;

  @Column({ type: 'text' })
  content: string;

  @Column({ default: 0 })
  tokenCount: number;

  @Column({ nullable: true })
  model: string;

  @Column({ nullable: true })
  mediaUrl: string;

  @Column({ type: 'varchar', default: 'text' })
  messageType: string;

  @ManyToOne(() => Conversation, (conv) => conv.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversationId' })
  conversation: Conversation;
}
