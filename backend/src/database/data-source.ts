import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { Device } from '../modules/devices/entities/device.entity';
import { Conversation } from '../modules/conversations/entities/conversation.entity';
import { ConversationMessage } from '../modules/conversations/entities/conversation-message.entity';
import { AIAgent } from '../modules/ai-agent/entities/ai-agent.entity';
import { ChatHistory } from '../modules/chat-history/entities/chat-history.entity';
import { User } from '../modules/auth/entities/user.entity';
import { Organization } from '../modules/auth/entities/organization.entity';
import { KnowledgeBase } from '../modules/knowledge-base/entities/knowledge-base.entity';
import { QuickReply } from '../modules/quick-reply/entities/quick-reply.entity';
import { MessageQueue } from '../modules/queue/entities/message-queue.entity';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'whatsapp_gateway',
  entities: [Device, Conversation, ConversationMessage, AIAgent, ChatHistory, User, Organization, KnowledgeBase, QuickReply, MessageQueue],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
  logging: process.env.APP_ENV === 'development',
});
