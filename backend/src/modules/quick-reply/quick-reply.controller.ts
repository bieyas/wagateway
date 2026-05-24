import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../auth/guards/organization.guard';
import { QuickReplyService, CreateQuickReplyDto, UpdateQuickReplyDto } from './quick-reply.service';
import { successResponse } from '../../common/utils/response.util';

@ApiTags('Quick Replies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, OrganizationGuard)
@Controller('dashboard/devices/:deviceId/quick-replies')
export class QuickReplyController {
  constructor(private readonly qrService: QuickReplyService) {}

  @Get()
  @ApiOperation({ summary: 'List quick replies, optionally filtered by search' })
  async list(@Param('deviceId') deviceId: string, @Query('q') search?: string) {
    const items = await this.qrService.list(deviceId, search);
    return successResponse(items);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new quick reply' })
  async create(@Param('deviceId') deviceId: string, @Body() dto: CreateQuickReplyDto) {
    const item = await this.qrService.create(deviceId, dto);
    return successResponse(item, 'Template berhasil ditambahkan');
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a quick reply' })
  async update(
    @Param('deviceId') deviceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateQuickReplyDto,
  ) {
    const item = await this.qrService.update(deviceId, id, dto);
    return successResponse(item, 'Template berhasil diperbarui');
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a quick reply' })
  async remove(@Param('deviceId') deviceId: string, @Param('id') id: string) {
    await this.qrService.remove(deviceId, id);
    return successResponse(null, 'Template berhasil dihapus');
  }

  @Post(':id/use')
  @ApiOperation({ summary: 'Increment usage count for a quick reply' })
  async use(@Param('deviceId') deviceId: string, @Param('id') id: string) {
    await this.qrService.incrementUsage(deviceId, id);
    return successResponse(null);
  }
}
