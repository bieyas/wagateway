import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Device } from '../../modules/devices/entities/device.entity';

export const CurrentDevice = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Device => {
    const request = ctx.switchToHttp().getRequest();
    return request.device;
  },
);
