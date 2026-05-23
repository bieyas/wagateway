import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  IsUrl,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateAIAgentDto {
  @ApiProperty({ required: false, description: 'Enable or disable AI agent' })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiProperty({ required: false, example: 'gpt-4o' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiProperty({ required: false, description: 'Full system prompt for the AI' })
  @IsOptional()
  @IsString()
  systemPrompt?: string;

  @ApiProperty({ required: false, example: 'Sari, CS Toko ABC' })
  @IsOptional()
  @IsString()
  persona?: string;

  @ApiProperty({ required: false, default: 0.7 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @ApiProperty({ required: false, default: 2048 })
  @IsOptional()
  @IsNumber()
  maxTokens?: number;

  @ApiProperty({ required: false, default: 20, description: 'Number of past messages to include as context' })
  @IsOptional()
  @IsNumber()
  contextWindow?: number;

  @ApiProperty({ required: false, default: false, description: 'Ignore operating hours, always reply 24/7' })
  @IsOptional()
  @IsBoolean()
  alwaysOn?: boolean;

  @ApiProperty({ required: false, example: '08:00' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  operatingStart?: string;

  @ApiProperty({ required: false, example: '22:00' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  operatingEnd?: string;

  @ApiProperty({ required: false, example: 'Asia/Jakarta' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiProperty({ required: false, example: ['agen', 'manusia', 'cs', 'operator'] })
  @IsOptional()
  @IsArray()
  handoffKeywords?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUrl()
  handoffWebhookUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  outsideHoursMessage?: string;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  simulateTyping?: boolean;

  @ApiProperty({ required: false, default: 50, description: 'Milliseconds per character for typing simulation' })
  @IsOptional()
  @IsNumber()
  typingDelayPerChar?: number;

  @ApiProperty({ required: false, default: 500 })
  @IsOptional()
  @IsNumber()
  minTypingDelay?: number;

  @ApiProperty({ required: false, default: 8000 })
  @IsOptional()
  @IsNumber()
  maxTypingDelay?: number;
}
