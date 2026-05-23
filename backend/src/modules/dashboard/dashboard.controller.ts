import {
  Controller, Get, Put, Post, Delete,
  Param, Body, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DevicesService } from '../devices/devices.service';
import { AIAgentService } from '../ai-agent/ai-agent.service';
import { UpdateAIAgentDto } from '../ai-agent/dto/update-ai-agent.dto';
import { UpdateDeviceDto } from '../devices/dto/update-device.dto';
import { CreateDeviceDto } from '../devices/dto/create-device.dto';
import { successResponse } from '../../common/utils/response.util';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly devicesService: DevicesService,
    private readonly aiAgentService: AIAgentService,
  ) {}

  @Get('devices')
  @ApiOperation({ summary: 'List all devices' })
  async listDevices() {
    const devices = await this.devicesService.findAll();
    return successResponse(devices.map((d) => ({
      id: d.id,
      deviceId: d.deviceId,
      token: d.token,
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

  @Post('devices')
  @ApiOperation({ summary: 'Create a new device' })
  async createDevice(@Body() dto: CreateDeviceDto) {
    const device = await this.devicesService.create(dto);
    return successResponse({
      id: device.id,
      deviceId: device.deviceId,
      token: device.token,
      name: device.name,
      status: device.status,
    }, 'Device berhasil dibuat');
  }

  @Put('devices/:deviceId')
  @ApiOperation({ summary: 'Update device' })
  async updateDevice(@Param('deviceId') deviceId: string, @Body() dto: UpdateDeviceDto) {
    const device = await this.devicesService.update(deviceId, dto);
    return successResponse(device);
  }

  @Delete('devices/:deviceId')
  @ApiOperation({ summary: 'Delete device' })
  async deleteDevice(@Param('deviceId') deviceId: string) {
    await this.devicesService.remove(deviceId);
    return successResponse(null, 'Device dihapus');
  }

  @Post('devices/:deviceId/connect')
  @ApiOperation({ summary: 'Connect device' })
  async connect(@Param('deviceId') deviceId: string) {
    const result = await this.devicesService.connect(deviceId);
    return successResponse(result);
  }

  @Post('devices/:deviceId/disconnect')
  @ApiOperation({ summary: 'Disconnect device' })
  async disconnect(@Param('deviceId') deviceId: string) {
    const result = await this.devicesService.disconnect(deviceId);
    return successResponse(result);
  }

  @Get('devices/:deviceId/qr')
  @ApiOperation({ summary: 'Get QR code for device' })
  async getQr(@Param('deviceId') deviceId: string) {
    const result = await this.devicesService.getQrCode(deviceId);
    return successResponse(result);
  }

  @Get('devices/:deviceId/ai-agent')
  @ApiOperation({ summary: 'Get AI agent config for device' })
  async getAIAgent(@Param('deviceId') deviceId: string) {
    const config = await this.aiAgentService.getConfig(deviceId);
    return successResponse(config || {
      enabled: false, model: 'gpt-4o',
      operatingStart: '08:00', operatingEnd: '22:00',
      timezone: 'Asia/Jakarta', simulateTyping: true, alwaysOn: false,
    });
  }

  @Put('devices/:deviceId/ai-agent')
  @ApiOperation({ summary: 'Update AI agent config for device' })
  async updateAIAgent(@Param('deviceId') deviceId: string, @Body() dto: UpdateAIAgentDto) {
    const config = await this.aiAgentService.upsertConfig(deviceId, dto);
    return successResponse(config, 'Konfigurasi AI agent diperbarui');
  }

  @Get('devices/:deviceId/ai-agent/blacklist')
  @ApiOperation({ summary: 'Get blacklist for device' })
  async getBlacklist(@Param('deviceId') deviceId: string) {
    return successResponse(this.aiAgentService.getBlacklistStatus(deviceId));
  }

  @Post('devices/:deviceId/ai-agent/blacklist')
  @ApiOperation({ summary: 'Add phone to blacklist' })
  async addBlacklist(@Param('deviceId') deviceId: string, @Body() body: { phone: string }) {
    await this.aiAgentService.addToBlacklist(deviceId, body.phone);
    return successResponse(this.aiAgentService.getBlacklistStatus(deviceId), `${body.phone} ditambahkan ke blacklist`);
  }

  @Delete('devices/:deviceId/ai-agent/blacklist/:phone')
  @ApiOperation({ summary: 'Remove phone from blacklist' })
  async removeBlacklist(@Param('deviceId') deviceId: string, @Param('phone') phone: string) {
    await this.aiAgentService.removeFromBlacklist(deviceId, phone);
    return successResponse(this.aiAgentService.getBlacklistStatus(deviceId), `${phone} dihapus dari blacklist`);
  }

  @Get('devices/:deviceId/ai-agent/whitelist')
  @ApiOperation({ summary: 'Get dev mode whitelist for device' })
  async getWhitelist(@Param('deviceId') deviceId: string) {
    return successResponse(this.aiAgentService.getWhitelistStatus(deviceId));
  }

  @Put('devices/:deviceId/ai-agent/whitelist/mode')
  @ApiOperation({ summary: 'Set dev mode on/off for device' })
  async setDevMode(@Param('deviceId') deviceId: string, @Body() body: { devMode: boolean }) {
    await this.aiAgentService.setDevMode(deviceId, body.devMode);
    return successResponse(this.aiAgentService.getWhitelistStatus(deviceId), `Dev mode ${body.devMode ? 'diaktifkan' : 'dinonaktifkan'}`);
  }

  @Post('devices/:deviceId/ai-agent/whitelist')
  @ApiOperation({ summary: 'Add phone to dev whitelist' })
  async addWhitelist(@Param('deviceId') deviceId: string, @Body() body: { phone: string }) {
    await this.aiAgentService.addToWhitelist(deviceId, body.phone);
    return successResponse(this.aiAgentService.getWhitelistStatus(deviceId), `${body.phone} ditambahkan ke whitelist`);
  }

  @Delete('devices/:deviceId/ai-agent/whitelist/:phone')
  @ApiOperation({ summary: 'Remove phone from dev whitelist' })
  async removeWhitelist(@Param('deviceId') deviceId: string, @Param('phone') phone: string) {
    await this.aiAgentService.removeFromWhitelist(deviceId, phone);
    return successResponse(this.aiAgentService.getWhitelistStatus(deviceId), `${phone} dihapus dari whitelist`);
  }

  @Get('devices/:deviceId/ai-agent/groups')
  @ApiOperation({ summary: 'Get group handling config for device' })
  async getGroupConfig(@Param('deviceId') deviceId: string) {
    const agent = await this.aiAgentService.getConfig(deviceId);
    return successResponse({
      groupEnabled: agent?.groupEnabled ?? false,
      allowedGroups: agent?.allowedGroups ?? [],
      groupMentionOnly: agent?.groupMentionOnly ?? true,
      groupPrefix: agent?.groupPrefix ?? null,
    });
  }

  @Put('devices/:deviceId/ai-agent/groups')
  @ApiOperation({ summary: 'Update group handling config for device' })
  async updateGroupConfig(
    @Param('deviceId') deviceId: string,
    @Body() body: {
      groupEnabled?: boolean;
      allowedGroups?: string[];
      groupMentionOnly?: boolean;
      groupPrefix?: string;
    },
  ) {
    const agent = await this.aiAgentService.updateGroupConfig(deviceId, body);
    return successResponse({
      groupEnabled: agent.groupEnabled,
      allowedGroups: agent.allowedGroups ?? [],
      groupMentionOnly: agent.groupMentionOnly,
      groupPrefix: agent.groupPrefix ?? null,
    }, 'Konfigurasi grup diperbarui');
  }
}
