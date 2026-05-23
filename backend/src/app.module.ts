import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import configuration from './config/configuration';
import { CommonModule } from './common/common.module';
import { Device } from './modules/devices/entities/device.entity';
import { Conversation } from './modules/conversations/entities/conversation.entity';
import { ConversationMessage } from './modules/conversations/entities/conversation-message.entity';
import { AIAgent } from './modules/ai-agent/entities/ai-agent.entity';
import { Admin } from './modules/auth/entities/admin.entity';
import { ChatHistory } from './modules/chat-history/entities/chat-history.entity';
import { DevicesModule } from './modules/devices/devices.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { AIAgentModule } from './modules/ai-agent/ai-agent.module';
import { AuthModule } from './modules/auth/auth.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ChatHistoryModule } from './modules/chat-history/chat-history.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { MediaModule } from './modules/media/media.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env', '../.env', './backend/.env'],
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('database.host'),
        port: config.get<number>('database.port'),
        username: config.get('database.username'),
        password: config.get('database.password'),
        database: config.get('database.name'),
        entities: [Device, Conversation, ConversationMessage, AIAgent, ChatHistory, Admin],
        synchronize: config.get('app.env') === 'development',
        logging: config.get('app.env') === 'development',
      }),
    }),

    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get('redis.host'),
          port: config.get<number>('redis.port'),
          password: config.get('redis.password'),
        },
      }),
    }),

    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    CommonModule,

    WhatsAppModule,
    DevicesModule,
    ConversationsModule,
    AIAgentModule,
    ChatHistoryModule,
    AuthModule,
    DashboardModule,
    MediaModule,
  ],
})
export class AppModule {}
