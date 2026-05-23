import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DevicesModule } from '../devices/devices.module';
import { AIAgentModule } from '../ai-agent/ai-agent.module';

@Module({
  imports: [DevicesModule, AIAgentModule],
  controllers: [DashboardController],
})
export class DashboardModule {}
