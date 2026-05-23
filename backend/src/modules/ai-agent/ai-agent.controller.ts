import { Controller, Get, Put, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity, ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray } from 'class-validator';
import { AIAgentService } from './ai-agent.service';
import { UpdateAIAgentDto } from './dto/update-ai-agent.dto';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { CurrentDevice } from '../../common/decorators/current-device.decorator';
import { Device } from '../devices/entities/device.entity';
import { successResponse } from '../../common/utils/response.util';

class AddWhitelistDto {
  @ApiProperty({ example: '6281234567890' })
  @IsString()
  phone: string;
}

class SetWhitelistDto {
  @ApiProperty({ example: ['6281234567890', '6289876543210'] })
  @IsArray()
  phones: string[];
}

@ApiTags('AI Agent')
@ApiSecurity('token')
@UseGuards(ApiKeyGuard)
@Controller('api/ai-agent')
export class AIAgentController {
  constructor(private readonly aiAgentService: AIAgentService) {}

  @Get()
  @ApiOperation({ summary: 'Get AI agent configuration for current device' })
  async getConfig(@CurrentDevice() device: Device) {
    const config = await this.aiAgentService.getConfig(device.deviceId);
    return successResponse(config || {
      enabled: false,
      model: 'gpt-4o',
      operatingStart: '08:00',
      operatingEnd: '22:00',
      timezone: 'Asia/Jakarta',
      simulateTyping: true,
    });
  }

  @Put()
  @ApiOperation({ summary: 'Create or update AI agent configuration' })
  async updateConfig(@CurrentDevice() device: Device, @Body() dto: UpdateAIAgentDto) {
    const config = await this.aiAgentService.upsertConfig(device.deviceId, dto);
    return successResponse(config, 'AI agent configuration updated');
  }

  @Get('whitelist')
  @ApiOperation({ summary: '[DEV] Get whitelist status and phone list' })
  async getWhitelist(@CurrentDevice() device: Device) {
    return successResponse(this.aiAgentService.getWhitelistStatus(device.deviceId));
  }

  @Post('whitelist')
  @ApiOperation({ summary: '[DEV] Add phone to whitelist' })
  async addToWhitelist(@CurrentDevice() device: Device, @Body() body: AddWhitelistDto) {
    await this.aiAgentService.addToWhitelist(device.deviceId, body.phone);
    return successResponse(this.aiAgentService.getWhitelistStatus(device.deviceId), `${body.phone} added to whitelist`);
  }

  @Delete('whitelist/:phone')
  @ApiOperation({ summary: '[DEV] Remove phone from whitelist' })
  async removeFromWhitelist(@CurrentDevice() device: Device, @Param('phone') phone: string) {
    await this.aiAgentService.removeFromWhitelist(device.deviceId, phone);
    return successResponse(this.aiAgentService.getWhitelistStatus(device.deviceId), `${phone} removed from whitelist`);
  }

  @Get('blacklist')
  @ApiOperation({ summary: 'Get blacklist \u2014 numbers that AI will never reply to (admin/operator)' })
  async getBlacklist(@CurrentDevice() device: Device) {
    return successResponse(this.aiAgentService.getBlacklistStatus(device.deviceId));
  }

  @Post('blacklist')
  @ApiOperation({ summary: 'Add phone to blacklist' })
  async addToBlacklist(@CurrentDevice() device: Device, @Body() body: AddWhitelistDto) {
    await this.aiAgentService.addToBlacklist(device.deviceId, body.phone);
    return successResponse(this.aiAgentService.getBlacklistStatus(device.deviceId), `${body.phone} added to blacklist`);
  }

  @Delete('blacklist/:phone')
  @ApiOperation({ summary: 'Remove phone from blacklist' })
  async removeFromBlacklist(@CurrentDevice() device: Device, @Param('phone') phone: string) {
    await this.aiAgentService.removeFromBlacklist(device.deviceId, phone);
    return successResponse(this.aiAgentService.getBlacklistStatus(device.deviceId), `${phone} removed from blacklist`);
  }

  @Put('blacklist')
  @ApiOperation({ summary: 'Replace entire blacklist' })
  async setBlacklist(@CurrentDevice() device: Device, @Body() body: SetWhitelistDto) {
    await this.aiAgentService.setBlacklist(device.deviceId, body.phones);
    return successResponse(this.aiAgentService.getBlacklistStatus(device.deviceId), 'Blacklist updated');
  }
}
