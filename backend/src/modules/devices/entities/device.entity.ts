import { Entity, Column, BeforeInsert } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { randomBytes } from 'crypto';

export enum DeviceStatus {
  INITIALIZING = 'initializing',
  SCAN_QR = 'scan_qr',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  BANNED = 'banned',
}

export enum WhatsAppEngine {
  BAILEYS = 'baileys',
  WWEBJS = 'wwebjs',
}

@Entity('devices')
export class Device extends BaseEntity {
  @Column({ unique: true, length: 6 })
  deviceId: string;

  @Column({ unique: true })
  token: string;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ type: 'enum', enum: DeviceStatus, default: DeviceStatus.DISCONNECTED })
  status: DeviceStatus;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  webhookUrl: string;

  @Column({ nullable: true })
  trackingUrl: string;

  @Column({ default: 1000 })
  messageDelay: number;

  @Column({ default: 0 })
  quotaUsed: number;

  @Column({ default: 1000 })
  quotaLimit: number;

  @Column({ type: 'enum', enum: WhatsAppEngine, default: WhatsAppEngine.BAILEYS })
  engine: WhatsAppEngine;

  @BeforeInsert()
  generateToken() {
    if (!this.deviceId) {
      this.deviceId = randomBytes(3).toString('hex').toUpperCase();
    }
    if (!this.token) {
      this.token = randomBytes(32).toString('hex');
    }
  }
}
