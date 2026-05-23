import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as QRCode from 'qrcode';
import { Device, DeviceStatus } from './entities/device.entity';
import { WhatsAppService } from '../../whatsapp/whatsapp.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';

@Injectable()
export class DevicesService {
  constructor(
    @InjectRepository(Device)
    private readonly deviceRepo: Repository<Device>,
    private readonly whatsappService: WhatsAppService,
  ) {}

  async create(dto: CreateDeviceDto, organizationId?: string): Promise<Device> {
    const device = this.deviceRepo.create({
      name: dto.name,
      webhookUrl: dto.webhookUrl,
      trackingUrl: dto.trackingUrl,
      messageDelay: dto.messageDelay || 1000,
      engine: dto.engine,
      organizationId: organizationId,
    });
    return this.deviceRepo.save(device);
  }

  async findAll(organizationId?: string): Promise<Device[]> {
    const where = organizationId ? { organizationId } : {};
    return this.deviceRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  async findOne(deviceId: string, organizationId?: string): Promise<Device> {
    const where: any = { deviceId };
    if (organizationId) where.organizationId = organizationId;
    const device = await this.deviceRepo.findOne({ where });
    if (!device) throw new NotFoundException(`Device ${deviceId} not found`);
    return device;
  }

  async update(deviceId: string, dto: UpdateDeviceDto, organizationId?: string): Promise<Device> {
    const device = await this.findOne(deviceId, organizationId);
    if (dto.name !== undefined) device.name = dto.name;
    if (dto.webhookUrl !== undefined) device.webhookUrl = (dto.webhookUrl || null) as string;
    if (dto.trackingUrl !== undefined) device.trackingUrl = (dto.trackingUrl || null) as string;
    if (dto.messageDelay !== undefined) device.messageDelay = dto.messageDelay;
    if (dto.isActive !== undefined) device.isActive = dto.isActive;
    if (dto.quotaLimit !== undefined) device.quotaLimit = dto.quotaLimit;
    if (dto.engine !== undefined) {
      device.engine = dto.engine;
      this.whatsappService.invalidateEngineCache(deviceId);
    }
    return this.deviceRepo.save(device);
  }

  async remove(deviceId: string, organizationId?: string): Promise<void> {
    const device = await this.findOne(deviceId, organizationId);
    await this.whatsappService.deleteSession(deviceId);
    await this.deviceRepo.remove(device);
  }

  async connect(deviceId: string, organizationId?: string): Promise<{ message: string }> {
    const device = await this.findOne(deviceId, organizationId);
    if (!device.isActive) {
      throw new BadRequestException('Device is inactive');
    }
    if (this.whatsappService.isConnected(deviceId)) {
      return { message: 'Device is already connected' };
    }
    await this.whatsappService.connect(deviceId);
    return { message: 'Connection initiated, scan QR code' };
  }

  async disconnect(deviceId: string, organizationId?: string): Promise<{ message: string }> {
    await this.findOne(deviceId, organizationId);
    await this.whatsappService.disconnect(deviceId);
    return { message: 'Device disconnected' };
  }

  async getQrCode(deviceId: string, organizationId?: string): Promise<{ qrcode: string }> {
    await this.findOne(deviceId, organizationId);
    const qr = this.whatsappService.getQrCode(deviceId);
    if (!qr) {
      throw new BadRequestException('No QR code available. Initiate connection first.');
    }
    const qrImage = await QRCode.toDataURL(qr);
    return { qrcode: qrImage };
  }

  async setWebhook(deviceId: string, webhookUrl: string, organizationId?: string): Promise<Device> {
    const device = await this.findOne(deviceId, organizationId);
    device.webhookUrl = webhookUrl;
    return this.deviceRepo.save(device);
  }

  async setTracking(deviceId: string, trackingUrl: string, organizationId?: string): Promise<Device> {
    const device = await this.findOne(deviceId, organizationId);
    device.trackingUrl = trackingUrl;
    return this.deviceRepo.save(device);
  }

  async findByToken(token: string): Promise<Device | null> {
    return this.deviceRepo.findOne({ where: { token, isActive: true } });
  }
}
