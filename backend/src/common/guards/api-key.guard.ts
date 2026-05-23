import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from '../../modules/devices/entities/device.entity';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    @InjectRepository(Device)
    private readonly deviceRepo: Repository<Device>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader: string =
      request.headers['authorization'] ||
      request.query['token'] ||
      request.query['apikey'] ||
      request.body?.apikey ||
      request.body?.token ||
      '';

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header required');
    }

    // Support Wablas-compatible format: "token.secretKey" — use only the token part
    const raw = authHeader.trim();
    const token = raw.includes('.') ? raw.split('.')[0] : raw;

    const device = await this.deviceRepo.findOne({
      where: { token, isActive: true },
    });

    if (!device) {
      throw new UnauthorizedException('Invalid or inactive token');
    }

    request.device = device;
    return true;
  }
}
