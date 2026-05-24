import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { QuickReply } from './entities/quick-reply.entity';

export interface CreateQuickReplyDto {
  shortcut: string;
  title: string;
  content: string;
  tags?: string[];
}

export interface UpdateQuickReplyDto {
  shortcut?: string;
  title?: string;
  content?: string;
  tags?: string[];
}

@Injectable()
export class QuickReplyService {
  constructor(
    @InjectRepository(QuickReply)
    private readonly repo: Repository<QuickReply>,
  ) {}

  async list(deviceId: string, search?: string): Promise<QuickReply[]> {
    if (search) {
      return this.repo.find({
        where: [
          { deviceId, title: ILike(`%${search}%`) },
          { deviceId, shortcut: ILike(`%${search}%`) },
        ],
        order: { usageCount: 'DESC', createdAt: 'ASC' },
      });
    }
    return this.repo.find({
      where: { deviceId },
      order: { usageCount: 'DESC', createdAt: 'ASC' },
    });
  }

  async create(deviceId: string, dto: CreateQuickReplyDto): Promise<QuickReply> {
    const item = this.repo.create({ ...dto, deviceId, tags: dto.tags ?? [] });
    return this.repo.save(item);
  }

  async update(deviceId: string, id: string, dto: UpdateQuickReplyDto): Promise<QuickReply> {
    const item = await this.repo.findOne({ where: { id, deviceId } });
    if (!item) throw new NotFoundException('Quick reply not found');
    Object.assign(item, dto);
    return this.repo.save(item);
  }

  async remove(deviceId: string, id: string): Promise<void> {
    const item = await this.repo.findOne({ where: { id, deviceId } });
    if (!item) throw new NotFoundException('Quick reply not found');
    await this.repo.remove(item);
  }

  async incrementUsage(deviceId: string, id: string): Promise<void> {
    await this.repo.increment({ id, deviceId }, 'usageCount', 1);
  }
}
