import { IsString, IsOptional, IsNumber, IsUrl, Min, Max, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { WhatsAppEngine } from '../entities/device.entity';

export class CreateDeviceDto {
  @ApiProperty({ example: 'Perangkat Toko ABC' })
  @IsString()
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUrl()
  webhookUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUrl()
  trackingUrl?: string;

  @ApiProperty({ required: false, default: 1000 })
  @IsOptional()
  @IsNumber()
  @Min(500)
  @Max(10000)
  messageDelay?: number;

  @ApiProperty({ required: false, enum: WhatsAppEngine, default: WhatsAppEngine.WWEBJS })
  @IsOptional()
  @IsEnum(WhatsAppEngine)
  engine?: WhatsAppEngine;
}
