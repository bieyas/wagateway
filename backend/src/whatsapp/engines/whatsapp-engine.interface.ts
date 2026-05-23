export interface SendTextOptions {
  phone: string;
  message: string;
  isGroup?: boolean;
}

export interface SendMediaOptions {
  phone: string;
  mediaUrl: string;
  caption?: string;
  filename?: string;
  isGroup?: boolean;
  type: 'image' | 'document' | 'video' | 'audio';
}

export interface IWhatsAppEngine {
  connect(deviceId: string): Promise<void>;
  disconnect(deviceId: string): Promise<void>;
  isConnected(deviceId: string): boolean;
  getQR(deviceId: string): string | null;
  sendText(deviceId: string, options: SendTextOptions): Promise<string>;
  sendImage(deviceId: string, options: SendMediaOptions): Promise<string>;
  sendDocument(deviceId: string, options: SendMediaOptions): Promise<string>;
  sendVideo(deviceId: string, options: SendMediaOptions): Promise<string>;
  sendAudio(deviceId: string, options: SendMediaOptions): Promise<string>;
  sendTyping(deviceId: string, phone: string, durationMs: number): Promise<void>;
  checkNumber(deviceId: string, phone: string): Promise<boolean>;
}
