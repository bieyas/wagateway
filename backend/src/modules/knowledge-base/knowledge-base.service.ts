import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KnowledgeBase, KbType } from './entities/knowledge-base.entity';

export interface CreateKbDto {
  type?: KbType;
  question: string;
  answer: string;
  sortOrder?: number;
}

export interface UpdateKbDto {
  type?: KbType;
  question?: string;
  answer?: string;
  isActive?: boolean;
  sortOrder?: number;
}

@Injectable()
export class KnowledgeBaseService {
  constructor(
    @InjectRepository(KnowledgeBase)
    private readonly repo: Repository<KnowledgeBase>,
  ) {}

  async list(deviceId: string): Promise<KnowledgeBase[]> {
    return this.repo.find({
      where: { deviceId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async create(deviceId: string, dto: CreateKbDto): Promise<KnowledgeBase> {
    const item = this.repo.create({
      deviceId,
      type: dto.type ?? KbType.FAQ,
      question: dto.question,
      answer: dto.answer,
      sortOrder: dto.sortOrder ?? 0,
    });
    return this.repo.save(item);
  }

  async update(deviceId: string, id: string, dto: UpdateKbDto): Promise<KnowledgeBase> {
    const item = await this.repo.findOne({ where: { id, deviceId } });
    if (!item) throw new NotFoundException('Knowledge base item not found');
    Object.assign(item, dto);
    return this.repo.save(item);
  }

  async remove(deviceId: string, id: string): Promise<void> {
    const item = await this.repo.findOne({ where: { id, deviceId } });
    if (!item) throw new NotFoundException('Knowledge base item not found');
    await this.repo.remove(item);
  }

  async buildContext(deviceId: string): Promise<string> {
    const items = await this.repo.find({
      where: { deviceId, isActive: true },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
    if (items.length === 0) return '';

    const lines = items.map(item => {
      if (item.type === KbType.RULE) return `[ATURAN] ${item.question}\n${item.answer}`;
      if (item.type === KbType.INFO) return `[INFO] ${item.question}\n${item.answer}`;
      return `T: ${item.question}\nJ: ${item.answer}`;
    });

    return `\n\n---\nKnowledge Base:\n${lines.join('\n\n')}`;
  }
}
