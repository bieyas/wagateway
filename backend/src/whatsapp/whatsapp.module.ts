import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppGateway } from './whatsapp.gateway';
import { WWebJSEngine } from './engines/wwebjs.engine';
import { Device } from '../modules/devices/entities/device.entity';
import { ChatHistoryModule } from '../modules/chat-history/chat-history.module';
import { MediaModule } from '../modules/media/media.module';

@Module({
  imports: [TypeOrmModule.forFeature([Device]), ChatHistoryModule, MediaModule],
  providers: [WhatsAppService, WhatsAppGateway, WWebJSEngine],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}
