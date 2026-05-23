import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AIAgentController } from './ai-agent.controller';
import { AIAgentService } from './ai-agent.service';
import { AIAgent } from './entities/ai-agent.entity';
import { Device } from '../devices/entities/device.entity';
import { WhatsAppModule } from '../../whatsapp/whatsapp.module';
import { ConversationsModule } from '../conversations/conversations.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AIAgent, Device]),
    WhatsAppModule,
    ConversationsModule,
  ],
  controllers: [AIAgentController],
  providers: [AIAgentService],
  exports: [AIAgentService],
})
export class AIAgentModule {}
