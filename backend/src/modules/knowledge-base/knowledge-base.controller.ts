import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../auth/guards/organization.guard';
import { KnowledgeBaseService, CreateKbDto, UpdateKbDto } from './knowledge-base.service';
import { successResponse } from '../../common/utils/response.util';

@ApiTags('Knowledge Base')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, OrganizationGuard)
@Controller('dashboard/devices/:deviceId/knowledge-base')
export class KnowledgeBaseController {
  constructor(private readonly kbService: KnowledgeBaseService) {}

  @Get()
  @ApiOperation({ summary: 'List all knowledge base items for a device' })
  async list(@Param('deviceId') deviceId: string) {
    const items = await this.kbService.list(deviceId);
    return successResponse(items);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new knowledge base item' })
  async create(@Param('deviceId') deviceId: string, @Body() dto: CreateKbDto) {
    const item = await this.kbService.create(deviceId, dto);
    return successResponse(item, 'Item berhasil ditambahkan');
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a knowledge base item' })
  async update(
    @Param('deviceId') deviceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateKbDto,
  ) {
    const item = await this.kbService.update(deviceId, id, dto);
    return successResponse(item, 'Item berhasil diperbarui');
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a knowledge base item' })
  async remove(@Param('deviceId') deviceId: string, @Param('id') id: string) {
    await this.kbService.remove(deviceId, id);
    return successResponse(null, 'Item berhasil dihapus');
  }
}
