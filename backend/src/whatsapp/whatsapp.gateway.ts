import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/ws',
})
export class WhatsAppGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WhatsAppGateway.name);

  afterInit() {
    this.logger.log('WebSocket gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.debug(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  @OnEvent('device.qr')
  handleDeviceQr(payload: { deviceId: string; qr: string }) {
    this.server.emit('device.qr', payload);
  }

  @OnEvent('device.connected')
  handleDeviceConnected(payload: { deviceId: string; phone: string }) {
    this.server.emit('device.connected', payload);
  }

  @OnEvent('device.disconnected')
  handleDeviceDisconnected(payload: { deviceId: string; reason: string }) {
    this.server.emit('device.disconnected', payload);
  }

  @OnEvent('device.status')
  handleDeviceStatus(payload: { deviceId: string; status: string }) {
    this.server.emit('device.status', payload);
  }

  @OnEvent('message.status')
  handleMessageStatus(payload: { deviceId: string; whatsappMessageId: string; status: number }) {
    this.server.emit('message.status', payload);
  }

  @OnEvent('message.incoming')
  handleIncomingMessage(payload: any) {
    this.server.emit('message.incoming', {
      deviceId: payload.deviceId,
      phone: payload.phone,
      senderName: payload.senderName,
      message: payload.message,
      type: payload.type,
      timestamp: payload.timestamp,
    });
  }
}
