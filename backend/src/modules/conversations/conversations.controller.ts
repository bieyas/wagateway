import { Controller, Get, Post, Delete, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity } from '@nestjs/swagger';
import { ConversationsService } from './conversations.service';
import { ChatsService } from './chats.service';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { CurrentDevice } from '../../common/decorators/current-device.decorator';
import { Device } from '../devices/entities/device.entity';
import { successResponse } from '../../common/utils/response.util';
import { WhatsAppService } from '../../whatsapp/whatsapp.service';

@ApiTags('AI Conversations')
@ApiSecurity('token')
@UseGuards(ApiKeyGuard)
@Controller('api/ai-agent/conversations')
export class ConversationsController {
  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly chatsService: ChatsService,
    private readonly whatsappService: WhatsAppService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all active conversations' })
  async list(@CurrentDevice() device: Device) {
    const convs = await this.conversationsService.listConversations(device.deviceId);
    return successResponse(convs);
  }

  @Get(':phone')
  @ApiOperation({ summary: 'Get conversation history for a phone number' })
  async getOne(@CurrentDevice() device: Device, @Param('phone') phone: string) {
    const conv = await this.conversationsService.getConversation(device.deviceId, phone);
    const messages = await this.conversationsService.getRecentMessages(conv.id, 100);
    return successResponse({ conversation: conv, messages });
  }

  @Delete(':phone')
  @ApiOperation({ summary: 'Reset conversation (clear history)' })
  async reset(@CurrentDevice() device: Device, @Param('phone') phone: string) {
    await this.conversationsService.resetConversation(device.deviceId, phone);
    return successResponse(null, 'Conversation reset');
  }

  @Post(':phone/handoff')
  @ApiOperation({ summary: 'Escalate conversation to human agent' })
  async handoff(@CurrentDevice() device: Device, @Param('phone') phone: string) {
    await this.conversationsService.escalate(device.deviceId, phone);
    return successResponse(null, 'Conversation escalated to human agent');
  }

  @Post(':phone/takeover')
  @ApiOperation({ summary: 'Human agent takes over (pauses AI)' })
  async takeover(@CurrentDevice() device: Device, @Param('phone') phone: string) {
    await this.conversationsService.setHumanTakeover(device.deviceId, phone);
    return successResponse(null, 'Human takeover activated, AI paused');
  }

  @Post(':phone/release')
  @ApiOperation({ summary: 'Release conversation back to AI' })
  async release(@CurrentDevice() device: Device, @Param('phone') phone: string) {
    await this.conversationsService.releaseToAI(device.deviceId, phone);
    return successResponse(null, 'Conversation returned to AI');
  }

  @Post(':phone/close')
  @ApiOperation({ summary: 'Close conversation' })
  async close(@CurrentDevice() device: Device, @Param('phone') phone: string) {
    await this.conversationsService.closeConversation(device.deviceId, phone);
    return successResponse(null, 'Conversation closed');
  }

  @Get(':phone/avatar')
  @ApiOperation({ summary: 'Get and cache profile picture URL for a contact' })
  async getAvatar(@CurrentDevice() device: Device, @Param('phone') phone: string) {
    const url = await this.conversationsService.refreshAvatar(device.deviceId, phone, this.whatsappService);
    return successResponse({ avatarUrl: url });
  }

  @Post(':phone/delete')
  @ApiOperation({ summary: 'Permanently delete conversation and all messages' })
  async deleteConversation(@CurrentDevice() device: Device, @Param('phone') phone: string) {
    await this.conversationsService.deleteConversation(device.deviceId, phone);
    return successResponse(null, 'Conversation deleted');
  }

  // ========== UNIFIED CHAT API (WhatsApp Web-style) ==========

  @Get('chats/all')
  @ApiOperation({ summary: 'Get all chat summaries (AI + regular chats) - WhatsApp Web style' })
  async getAllChats(@CurrentDevice() device: Device) {
    const chats = await this.chatsService.getChatSummaries(device.deviceId);
    return successResponse(chats);
  }

  @Get('chats/:phone')
  @ApiOperation({ summary: 'Get unified chat history for a phone number' })
  async getChatHistory(@CurrentDevice() device: Device, @Param('phone') phone: string) {
    const history = await this.chatsService.getChatHistory(device.deviceId, phone);
    return successResponse(history);
  }
}
