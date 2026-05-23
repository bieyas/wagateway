import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatHistoryService } from './chat-history.service';
import { ChatHistoryController } from './chat-history.controller';
import { ChatHistory } from './entities/chat-history.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ChatHistory])],
  providers: [ChatHistoryService],
  controllers: [ChatHistoryController],
  exports: [ChatHistoryService],
})
export class ChatHistoryModule {}
