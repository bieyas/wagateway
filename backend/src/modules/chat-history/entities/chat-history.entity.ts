import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

export enum ChatType {
  INDIVIDUAL = 'individual',
  GROUP = 'group',
}

export enum MessageDirection {
  INCOMING = 'incoming',
  OUTGOING = 'outgoing',
}

@Entity('chat_history')
@Index(['deviceId', 'chatJid', 'messageTimestamp'])
export class ChatHistory extends BaseEntity {
  @Column()
  deviceId: string;

  @Column()
  chatJid: string;

  @Column({ type: 'enum', enum: ChatType, default: ChatType.INDIVIDUAL })
  chatType: ChatType;

  @Column({ nullable: true })
  chatName: string;

  @Column()
  messageId: string;

  @Column({ type: 'enum', enum: MessageDirection })
  direction: MessageDirection;

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({ nullable: true })
  mediaUrl: string;

  @Column({ type: 'enum', enum: ['text', 'image', 'video', 'audio', 'document', 'location', 'contact'], default: 'text' })
  messageType: string;

  @Column({ type: 'bigint' })
  messageTimestamp: number;

  @Column({ default: false })
  isRead: boolean;

  @Column({ type: 'simple-json', nullable: true })
  rawData: any;
}
