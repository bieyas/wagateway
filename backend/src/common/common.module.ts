import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Device } from '../modules/devices/entities/device.entity';
import { ApiKeyGuard } from './guards/api-key.guard';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Device])],
  providers: [ApiKeyGuard],
  exports: [ApiKeyGuard, TypeOrmModule],
})
export class CommonModule {}
