import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessageQueue } from './entities/message-queue.entity';
import { QueueService } from './queue.service';
import { WhatsAppModule } from '../../whatsapp/whatsapp.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { DevicesModule } from '../devices/devices.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MessageQueue]),
    WhatsAppModule,
    ConversationsModule,
    forwardRef(() => DevicesModule),
  ],
  providers: [QueueService],
  exports: [QueueService],
})
export class QueueModule {}
