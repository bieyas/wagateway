import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AIAgentController } from './ai-agent.controller';
import { AIAgentService } from './ai-agent.service';
import { AiReplyService } from './ai-reply.service';
import { AiWebhookService } from './ai-webhook.service';
import { AIAgent } from './entities/ai-agent.entity';
import { Device } from '../devices/entities/device.entity';
import { WhatsAppModule } from '../../whatsapp/whatsapp.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { KnowledgeBaseModule } from '../knowledge-base/knowledge-base.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AIAgent, Device]),
    WhatsAppModule,
    ConversationsModule,
    KnowledgeBaseModule,
  ],
  controllers: [AIAgentController],
  providers: [AIAgentService, AiReplyService, AiWebhookService],
  exports: [AIAgentService],
})
export class AIAgentModule {}
