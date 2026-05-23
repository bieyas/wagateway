import { IsString, IsOptional, IsNumber, IsUrl, Min, Max, IsBoolean, IsEnum, ValidateIf } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { WhatsAppEngine } from '../entities/device.entity';

export class UpdateDeviceDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @ValidateIf(o => o.webhookUrl !== '')
  @IsUrl({}, { message: 'webhookUrl must be a valid URL' })
  webhookUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @ValidateIf(o => o.trackingUrl !== '')
  @IsUrl({}, { message: 'trackingUrl must be a valid URL' })
  trackingUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(500)
  @Max(10000)
  messageDelay?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  quotaLimit?: number;

  @ApiProperty({ required: false, enum: WhatsAppEngine, description: 'WhatsApp engine: baileys or wwebjs' })
  @IsOptional()
  @IsEnum(WhatsAppEngine)
  engine?: WhatsAppEngine;
}
