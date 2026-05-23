import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Device } from '../../devices/entities/device.entity';

@Entity('ai_agents')
export class AIAgent extends BaseEntity {
  @Column({ unique: true })
  @Index()
  deviceId: string;

  @ManyToOne(() => Device, { onDelete: 'CASCADE', nullable: true, eager: false })
  @JoinColumn({ name: 'deviceId', referencedColumnName: 'deviceId' })
  device: Device;

  @Column({ default: false })
  enabled: boolean;

  @Column({ default: 'gpt-4o' })
  model: string;

  @Column({ type: 'text', nullable: true })
  systemPrompt: string;

  @Column({ nullable: true })
  persona: string;

  @Column({ type: 'float', default: 0.7 })
  temperature: number;

  @Column({ default: 2048 })
  maxTokens: number;

  @Column({ default: 20 })
  contextWindow: number;

  @Column({ default: false })
  alwaysOn: boolean;

  @Column({ default: false })
  devMode: boolean;

  @Column({ type: 'simple-array', nullable: true })
  whitelistPhones: string[];

  @Column({ default: '08:00' })
  operatingStart: string;

  @Column({ default: '22:00' })
  operatingEnd: string;

  @Column({ default: 'Asia/Jakarta' })
  timezone: string;

  @Column({ type: 'simple-array', nullable: true })
  handoffKeywords: string[];

  @Column({ type: 'simple-array', nullable: true })
  blacklistPhones: string[];

  @Column({ nullable: true })
  handoffWebhookUrl: string;

  @Column({ type: 'text', nullable: true })
  outsideHoursMessage: string;

  @Column({ default: true })
  simulateTyping: boolean;

  @Column({ default: 50 })
  typingDelayPerChar: number;

  @Column({ default: 500 })
  minTypingDelay: number;

  @Column({ default: 8000 })
  maxTypingDelay: number;
}
