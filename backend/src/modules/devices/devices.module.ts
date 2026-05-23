import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import { Device } from './entities/device.entity';
import { WhatsAppModule } from '../../whatsapp/whatsapp.module';
import { ConversationsModule } from '../conversations/conversations.module';

@Module({
  imports: [TypeOrmModule.forFeature([Device]), WhatsAppModule, ConversationsModule],
  controllers: [DevicesController],
  providers: [DevicesService],
  exports: [DevicesService],
})
export class DevicesModule {}
