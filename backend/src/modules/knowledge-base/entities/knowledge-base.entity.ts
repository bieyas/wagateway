import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

export enum KbType {
  FAQ  = 'faq',
  INFO = 'info',
  RULE = 'rule',
}

@Entity('knowledge_base')
@Index(['deviceId'])
export class KnowledgeBase extends BaseEntity {
  @Column()
  @Index()
  deviceId: string;

  @Column({ type: 'enum', enum: KbType, default: KbType.FAQ })
  type: KbType;

  @Column()
  question: string;

  @Column({ type: 'text' })
  answer: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 0 })
  sortOrder: number;
}
