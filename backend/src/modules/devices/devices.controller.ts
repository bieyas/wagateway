import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity } from '@nestjs/swagger';
import { DevicesService } from './devices.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { SetWebhookDto, SetTrackingDto, CheckNumberDto } from './dto/webhook.dto';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { CurrentDevice } from '../../common/decorators/current-device.decorator';
import { Device } from './entities/device.entity';
import { WhatsAppService } from '../../whatsapp/whatsapp.service';
import { ConversationsService } from '../conversations/conversations.service';
import { MessageRole } from '../conversations/entities/conversation-message.entity';
import { successResponse, errorResponse } from '../../common/utils/response.util';
import { normalizePhone } from '../../common/utils/phone.util';

@ApiTags('Devices')
@Controller()
export class DevicesController {
  constructor(
    private readonly devicesService: DevicesService,
    private readonly whatsappService: WhatsAppService,
    private readonly conversationsService: ConversationsService,
  ) {}

  @Post('api/device')
  @ApiOperation({ summary: 'Create a new device' })
  async create(@Body() dto: CreateDeviceDto) {
    const device = await this.devicesService.create(dto);
    return successResponse({
      id: device.id,
      deviceId: device.deviceId,
      token: device.token,
      name: device.name,
      status: device.status,
    }, 'Device created successfully');
  }

  @Get('api/device')
  @ApiOperation({ summary: 'List all devices' })
  async findAll() {
    const devices = await this.devicesService.findAll();
    return successResponse(devices.map((d) => ({
      id: d.id,
      deviceId: d.deviceId,
      name: d.name,
      phone: d.phone,
      status: d.status,
      isActive: d.isActive,
      quotaUsed: d.quotaUsed,
      quotaLimit: d.quotaLimit,
      webhookUrl: d.webhookUrl,
      trackingUrl: d.trackingUrl,
      engine: d.engine,
    })));
  }

  @Get('api/device/info')
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('token')
  @ApiOperation({ summary: 'Get device info (Wablas compatible)' })
  async deviceInfo(@CurrentDevice() device: Device) {
    return {
      status: true,
      message: 'Device info',
      data: {
        name: device.name,
        serial: device.deviceId,
        sender: device.phone,
        quota: device.quotaLimit ?? 0,
        status: device.status,
        active: device.isActive,
      },
    };
  }

  @Get('api/device/:deviceId')
  @ApiOperation({ summary: 'Get device detail' })
  async findOne(@Param('deviceId') deviceId: string) {
    const device = await this.devicesService.findOne(deviceId);
    return successResponse(device);
  }

  @Put('api/device/:deviceId')
  @ApiOperation({ summary: 'Update device' })
  async update(@Param('deviceId') deviceId: string, @Body() dto: UpdateDeviceDto) {
    const device = await this.devicesService.update(deviceId, dto);
    return successResponse(device);
  }

  @Delete('api/device/:deviceId')
  @ApiOperation({ summary: 'Delete device and session' })
  async remove(@Param('deviceId') deviceId: string) {
    await this.devicesService.remove(deviceId);
    return successResponse(null, 'Device deleted');
  }

  @Post('api/device/:deviceId/connect')
  @ApiOperation({ summary: 'Initiate WhatsApp connection' })
  async connect(@Param('deviceId') deviceId: string) {
    const result = await this.devicesService.connect(deviceId);
    return successResponse(result);
  }

  @Post('api/device/:deviceId/disconnect')
  @ApiOperation({ summary: 'Disconnect WhatsApp' })
  async disconnect(@Param('deviceId') deviceId: string) {
    const result = await this.devicesService.disconnect(deviceId);
    return successResponse(result);
  }

  @Get('api/device/scan')
  @ApiOperation({ summary: 'Get QR code for scanning (token required)' })
  @ApiSecurity('token')
  async getQrCode() {
    return successResponse({ message: 'Use /api/device/:deviceId/qr endpoint' });
  }

  @Get('api/device/:deviceId/qr')
  @ApiOperation({ summary: 'Get QR code image (base64)' })
  async getQr(@Param('deviceId') deviceId: string) {
    const result = await this.devicesService.getQrCode(deviceId);
    return successResponse(result);
  }

  @Post('api/setting/webhook')
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('token')
  @ApiOperation({ summary: 'Set incoming message webhook URL (Wablas compatible)' })
  async setWebhook(@CurrentDevice() device: Device, @Body() body: SetWebhookDto) {
    const updated = await this.devicesService.setWebhook(device.deviceId, body.webhookUrl);
    return successResponse({ webhookUrl: updated.webhookUrl }, 'Webhook URL updated');
  }

  @Post('api/setting/tracking')
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('token')
  @ApiOperation({ summary: 'Set message status tracking URL (Wablas compatible)' })
  async setTracking(@CurrentDevice() device: Device, @Body() body: SetTrackingDto) {
    const updated = await this.devicesService.setTracking(device.deviceId, body.trackingUrl);
    return successResponse({ trackingUrl: updated.trackingUrl }, 'Tracking URL updated');
  }

  @Post('api/check-number')
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('token')
  @ApiOperation({ summary: 'Check if phone number is registered on WhatsApp' })
  async checkNumber(@CurrentDevice() device: Device, @Body() body: CheckNumberDto) {
    try {
      const phone = normalizePhone(body.phone);
      const result = await this.whatsappService.checkNumber(device.deviceId, phone);
      return successResponse({ phone, ...result });
    } catch (err) {
      return errorResponse(err.message);
    }
  }

  @Post('api/check-connection')
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('token')
  @ApiOperation({ summary: 'Check device connection status (MixRadius/Wablas compatible)' })
  async checkConnection(@CurrentDevice() device: Device) {
    const connected = this.whatsappService.isConnected(device.deviceId);
    if (!connected) {
      return errorResponse(`Device ${device.deviceId} is not connected`);
    }
    return successResponse({
      deviceId: device.deviceId,
      phone: device.phone,
      status: device.status,
    }, 'Device is connected');
  }

  @Post('api/v2/send-message')
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('token')
  @ApiOperation({ summary: 'Send bulk messages (Wablas v2 compatible)' })
  async sendMessageBulk(
    @CurrentDevice() device: Device,
    @Body() body: { data: Array<{ phone: string; message?: string; type?: string; mediaUrl?: string; caption?: string; filename?: string; isGroup?: boolean }> },
  ) {
    if (!Array.isArray(body?.data)) {
      return errorResponse('data array is required');
    }
    const results = await Promise.allSettled(
      body.data.map(async (item) => {
        const phone = item.phone?.includes('@') ? item.phone : normalizePhone(item.phone);
        const type = item.type || 'text';
        const isGroup = item.isGroup ?? false;
        let msgId: string;
        if (type === 'image' && item.mediaUrl) {
          msgId = await this.whatsappService.sendImage(device.deviceId, { phone, mediaUrl: item.mediaUrl, caption: item.caption || item.message || '', isGroup, type: 'image' });
        } else if (type === 'video' && item.mediaUrl) {
          msgId = await this.whatsappService.sendVideo(device.deviceId, { phone, mediaUrl: item.mediaUrl, caption: item.caption || item.message || '', isGroup, type: 'video' });
        } else if (type === 'audio' && item.mediaUrl) {
          msgId = await this.whatsappService.sendAudio(device.deviceId, { phone, mediaUrl: item.mediaUrl, isGroup, type: 'audio' });
        } else if (type === 'document' && item.mediaUrl) {
          msgId = await this.whatsappService.sendDocument(device.deviceId, { phone, mediaUrl: item.mediaUrl, caption: item.caption || item.message || '', filename: item.filename, isGroup, type: 'document' });
        } else {
          msgId = await this.whatsappService.sendText(device.deviceId, { phone, message: item.message || '', isGroup });
        }
        // Save to conversation so it appears in chat history
        try {
          const conv = await this.conversationsService.findOrCreate(device.deviceId, phone);
          const content = item.caption || item.message || '';
          await this.conversationsService.addMessage(
            conv.id,
            MessageRole.ASSISTANT,
            content,
            0,
            'webhook',
            type !== 'text' ? item.mediaUrl : undefined,
            type !== 'text' ? type : 'text',
          );
        } catch (_) { /* non-critical */ }
        return msgId;
      }),
    );
    const sent = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    return successResponse({ sent, failed, total: results.length }, 'Bulk messages processed');
  }

  @Post('api/send-message')
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('token')
  @ApiOperation({ summary: 'Send text or media message' })
  async sendMessage(
    @CurrentDevice() device: Device,
    @Body() body: {
      phone: string;
      message?: string;
      type?: string;
      mediaUrl?: string;
      caption?: string;
      filename?: string;
      isGroup?: boolean;
    },
  ) {
    if (!body.phone) throw new BadRequestException('phone is required');
    const phone = body.phone.includes('@') ? body.phone : normalizePhone(body.phone);
    const type = body.type || 'text';
    const isGroup = body.isGroup ?? false;

    try {
      let msgId: string;

      if (type === 'image') {
        if (!body.mediaUrl) throw new BadRequestException('mediaUrl is required for image type');
        msgId = await this.whatsappService.sendImage(device.deviceId, {
          phone,
          mediaUrl: body.mediaUrl,
          caption: body.caption || body.message || '',
          isGroup,
          type: 'image',
        });
      } else if (type === 'video') {
        if (!body.mediaUrl) throw new BadRequestException('mediaUrl is required for video type');
        msgId = await this.whatsappService.sendVideo(device.deviceId, {
          phone,
          mediaUrl: body.mediaUrl,
          caption: body.caption || body.message || '',
          isGroup,
          type: 'video',
        });
      } else if (type === 'audio') {
        if (!body.mediaUrl) throw new BadRequestException('mediaUrl is required for audio type');
        msgId = await this.whatsappService.sendAudio(device.deviceId, {
          phone,
          mediaUrl: body.mediaUrl,
          isGroup,
          type: 'audio',
        });
      } else if (type === 'document') {
        if (!body.mediaUrl) throw new BadRequestException('mediaUrl is required for document type');
        msgId = await this.whatsappService.sendDocument(device.deviceId, {
          phone,
          mediaUrl: body.mediaUrl,
          caption: body.caption || body.message || '',
          filename: body.filename,
          isGroup,
          type: 'document',
        });
      } else {
        if (!body.message?.trim()) throw new BadRequestException('message is required for text type');
        msgId = await this.whatsappService.sendText(device.deviceId, {
          phone,
          message: body.message,
          isGroup,
        });
      }

      // Save CS reply to conversation so it appears in chat history
      try {
        const conv = await this.conversationsService.findOrCreate(
          device.deviceId,
          phone,
        );
        const msgContent = body.caption || body.message || '';
        const msgType = type !== 'text' ? type : 'text';
        const mediaUrlToSave = type !== 'text' ? body.mediaUrl : undefined;
        await this.conversationsService.addMessage(
          conv.id,
          MessageRole.ASSISTANT,
          msgContent,
          0,
          'human-cs',
          mediaUrlToSave,
          msgType,
        );
      } catch (_) { /* non-critical */ }

      return {
        status: true,
        message: 'Message sent',
        data: {
          id: msgId,
          receiver: phone,
          message: body.caption || body.message || '',
          message_status: 'pending',
          quota: device.quotaLimit ?? 0,
        },
      };
    } catch (err) {
      return errorResponse(err.message);
    }
  }

  @Get('api/send-message')
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('token')
  @ApiOperation({ summary: 'Send text message via GET (Wablas simple compatible)' })
  async sendMessageGet(
    @CurrentDevice() device: Device,
    @Query('phone') phone: string,
    @Query('message') message: string,
    @Query('isGroup') isGroup: string,
  ) {
    if (!phone) throw new BadRequestException('phone is required');
    if (!message?.trim()) throw new BadRequestException('message is required');
    const normalizedPhone = phone.includes('@') ? phone : normalizePhone(phone);
    try {
      const msgId = await this.whatsappService.sendText(device.deviceId, {
        phone: normalizedPhone,
        message,
        isGroup: isGroup === 'true',
      });
      return {
        status: true,
        message: 'Message sent',
        data: {
          id: msgId,
          receiver: normalizedPhone,
          message,
          message_status: 'pending',
          quota: device.quotaLimit ?? 0,
        },
      };
    } catch (err) {
      return errorResponse(err.message);
    }
  }

}
