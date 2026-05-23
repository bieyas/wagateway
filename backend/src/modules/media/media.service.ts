import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface SavedMedia {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  localPath: string;
}

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly uploadDir: string;
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.uploadDir = path.resolve(
      this.configService.get<string>('media.uploadDir') || './uploads',
    );
    this.baseUrl = this.configService.get<string>('media.baseUrl') || '';
    this.ensureUploadDir();
  }

  private ensureUploadDir(): void {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
      this.logger.log(`Created upload directory: ${this.uploadDir}`);
    }
  }

  async saveBuffer(
    buffer: Buffer,
    mimeType: string,
    originalName?: string,
  ): Promise<SavedMedia> {
    const ext = this.mimeToExt(mimeType);
    const filename = `${uuidv4()}.${ext}`;
    const localPath = path.join(this.uploadDir, filename);

    await fs.promises.writeFile(localPath, buffer);

    const url = `${this.baseUrl}/api/media/${filename}`;
    const size = buffer.length;

    this.logger.debug(`Saved media: ${filename} (${size} bytes, ${mimeType})`);

    return {
      filename,
      originalName: originalName || filename,
      mimeType,
      size,
      url,
      localPath,
    };
  }

  async deleteFile(filename: string): Promise<void> {
    const localPath = path.join(this.uploadDir, filename);
    if (fs.existsSync(localPath)) {
      await fs.promises.unlink(localPath);
      this.logger.debug(`Deleted media: ${filename}`);
    }
  }

  getLocalPath(filename: string): string {
    return path.join(this.uploadDir, filename);
  }

  private mimeToExt(mimeType: string): string {
    const map: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'video/mp4': 'mp4',
      'video/mpeg': 'mpeg',
      'video/quicktime': 'mov',
      'audio/mpeg': 'mp3',
      'audio/mp4': 'm4a',
      'audio/ogg': 'ogg',
      'audio/wav': 'wav',
      'audio/webm': 'webm',
      'application/pdf': 'pdf',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'application/vnd.ms-excel': 'xls',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
      'application/zip': 'zip',
      'application/octet-stream': 'bin',
    };
    return map[mimeType] || 'bin';
  }

  mimeToMediaType(mimeType: string): 'image' | 'video' | 'audio' | 'document' {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'document';
  }
}
