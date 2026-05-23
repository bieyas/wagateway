import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Get,
  Param,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { MediaService } from './media.service';
import { successResponse } from '../../common/utils/response.util';
import { memoryStorage } from 'multer';

@ApiTags('Media')
@Controller('api/media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload media file (image/video/audio/document)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  async upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');

    const saved = await this.mediaService.saveBuffer(
      file.buffer,
      file.mimetype,
      file.originalname,
    );

    return successResponse(
      {
        url: saved.url,
        filename: saved.filename,
        originalName: saved.originalName,
        mimeType: saved.mimeType,
        size: saved.size,
        mediaType: this.mediaService.mimeToMediaType(saved.mimeType),
      },
      'File uploaded successfully',
    );
  }

  @Get(':filename')
  @ApiOperation({ summary: 'Serve media file' })
  async serveFile(@Param('filename') filename: string, @Res() res: Response) {
    const localPath = this.mediaService.getLocalPath(filename);
    if (!fs.existsSync(localPath)) {
      throw new NotFoundException('File not found');
    }
    res.sendFile(path.resolve(localPath));
  }
}
