import { IsUrl, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetWebhookDto {
  @ApiProperty({ example: 'https://yourbillingapp.com/webhook/whatsapp' })
  @IsUrl()
  webhookUrl: string;
}

export class SetTrackingDto {
  @ApiProperty({ example: 'https://yourbillingapp.com/webhook/tracking' })
  @IsUrl()
  trackingUrl: string;
}

export class CheckNumberDto {
  @ApiProperty({ example: '6281234567890' })
  @IsString()
  phone: string;
}
