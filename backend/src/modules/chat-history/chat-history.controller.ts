import { Controller, Get, Query, UseGuards, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity, ApiQuery } from '@nestjs/swagger';
import { ChatHistoryService } from './chat-history.service';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { CurrentDevice } from '../../common/decorators/current-device.decorator';
import { Device } from '../devices/entities/device.entity';
import { successResponse } from '../../common/utils/response.util';

@ApiTags('Chat History')
@Controller('api')
export class ChatHistoryController {
  constructor(private readonly chatHistoryService: ChatHistoryService) {}

  @Get('chats')
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('token')
  @ApiOperation({ summary: 'Get chat list (unique conversations)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getChatList(
    @CurrentDevice() device: Device,
    @Query('limit') limit?: string,
  ) {
    const chats = await this.chatHistoryService.getChatList(
      device.deviceId,
      limit ? parseInt(limit, 10) : 50,
    );
    return successResponse(chats);
  }

  @Get('chats/:chatJid/messages')
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('token')
  @ApiOperation({ summary: 'Get messages for specific chat' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'before', required: false, type: Number })
  async getChatMessages(
    @CurrentDevice() device: Device,
    @Param('chatJid') chatJid: string,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
  ) {
    const messages = await this.chatHistoryService.getChatMessages(
      device.deviceId,
      decodeURIComponent(chatJid),
      limit ? parseInt(limit, 10) : 50,
      before ? parseInt(before, 10) : undefined,
    );
    return successResponse(messages);
  }

  @Get('chats/search')
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('token')
  @ApiOperation({ summary: 'Search messages' })
  @ApiQuery({ name: 'q', required: true, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async searchMessages(
    @CurrentDevice() device: Device,
    @Query('q') searchTerm: string,
    @Query('limit') limit?: string,
  ) {
    const results = await this.chatHistoryService.searchMessages(
      device.deviceId,
      searchTerm,
      limit ? parseInt(limit, 10) : 20,
    );
    return successResponse(results);
  }

  @Get('chats/unread')
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('token')
  @ApiOperation({ summary: 'Get unread message counts per chat' })
  async getUnreadCounts(@CurrentDevice() device: Device) {
    const counts = await this.chatHistoryService.getUnreadCounts(device.deviceId);
    return successResponse(counts);
  }
}
