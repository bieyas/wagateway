import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { ChatsService } from './chats.service';
import { Conversation } from './entities/conversation.entity';
import { ConversationMessage } from './entities/conversation-message.entity';
import { WhatsAppModule } from '../../whatsapp/whatsapp.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Conversation, ConversationMessage]),
    WhatsAppModule,
  ],
  controllers: [ConversationsController],
  providers: [ConversationsService, ChatsService],
  exports: [ConversationsService, ChatsService],
})
export class ConversationsModule {}
