import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiSecurity } from '@nestjs/swagger';
import { DevicesService } from './devices.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { SetWebhookDto, SetTrackingDto, CheckNumberDto } from './dto/webhook.dto';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { CurrentDevice } from '../../common/decorators/current-device.decorator';
import { Device } from './entities/device.entity';
import { WhatsAppService } from '../../whatsapp/whatsapp.service';
import { successResponse, errorResponse } from '../../common/utils/response.util';
import { normalizePhone } from '../../common/utils/phone.util';
import { QueueService } from '../queue/queue.service';

@ApiTags('Devices')
@Controller()
export class DevicesController {
  private readonly logger = new Logger('MixRadiusAudit');

  constructor(
    private readonly devicesService: DevicesService,
    private readonly whatsappService: WhatsAppService,
    private readonly queueService: QueueService,
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
  @ApiOperation({ summary: 'Send bulk messages via queue (Wablas v2 compatible)' })
  async sendMessageBulk(
    @CurrentDevice() device: Device,
    @Body() body: { data: Array<{ phone: string; message?: string; type?: string; mediaUrl?: string; caption?: string; filename?: string; isGroup?: boolean }> },
    @Req() req: Request,
  ) {
    // [AUDIT] Log raw request from MixRadius for payload inspection
    this.logger.log(`[MIXRADIUS] POST /api/v2/send-message from ${req.headers['x-forwarded-for'] || req.socket?.remoteAddress}`);
    this.logger.log(`[MIXRADIUS] Headers: ${JSON.stringify(Object.fromEntries(Object.entries(req.headers).filter(([k]) => !['authorization','cookie'].includes(k))))}`);
    this.logger.log(`[MIXRADIUS] Raw body: ${JSON.stringify(body)}`);

    if (!Array.isArray(body?.data)) {
      return errorResponse('data array is required');
    }
    const items = body.data.map(item => ({
      ...item,
      phone: item.isGroup || item.phone?.includes('@') ? item.phone : normalizePhone(item.phone),
    }));
    const { batchId, jobIds } = await this.queueService.enqueue(device.deviceId, items);
    return successResponse({ batchId, queued: jobIds.length, jobIds }, `${jobIds.length} messages queued`);
  }

  @Get('api/queue/batch/:batchId')
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('token')
  @ApiOperation({ summary: 'Get batch queue status' })
  async getBatchStatus(@Param('batchId') batchId: string) {
    const result = await this.queueService.getBatchStatus(batchId);
    return successResponse(result);
  }

  @Get('api/queue/job/:jobId')
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('token')
  @ApiOperation({ summary: 'Get single job status' })
  async getJobStatus(@Param('jobId') jobId: string) {
    const job = await this.queueService.getJobStatus(jobId);
    if (!job) return errorResponse('Job not found');
    return successResponse(job);
  }

  @Get('api/queue')
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('token')
  @ApiOperation({ summary: 'List recent queue jobs for this device' })
  async listQueue(
    @CurrentDevice() device: Device,
    @Query('limit') limit?: string,
  ) {
    const jobs = await this.queueService.getDeviceQueue(device.deviceId, limit ? parseInt(limit) : 50);
    return successResponse(jobs);
  }

  @Post('api/queue/retry')
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('token')
  @ApiOperation({ summary: 'Retry failed jobs (optionally filter by batchId)' })
  async retryFailed(
    @CurrentDevice() device: Device,
    @Body() body: { batchId?: string },
  ) {
    const count = await this.queueService.retryFailed(device.deviceId, body?.batchId);
    return successResponse({ retried: count }, `${count} jobs re-queued`);
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
    try {
      const msgId = await this.devicesService.sendMessage(device, body);
      const phone = body.isGroup || body.phone.includes('@') ? body.phone : normalizePhone(body.phone);
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
      const msgId = await this.devicesService.sendMessage(device, { phone: normalizedPhone, message, isGroup: isGroup === 'true' });
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
