import { All, Controller, Logger, Req } from '@nestjs/common';
import { Request } from 'express';

@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger('WebhookInbound');

  /**
   * Catch-all endpoint untuk semua inbound webhook.
   * Mendukung GET/POST/PUT dari provider manapun (MixRadius, dll).
   * Semua request di-log secara verbose untuk inspeksi payload.
   *
   * Endpoint: /webhook/:provider  (contoh: /webhook/mixradius)
   */
  @All(':provider')
  async receive(@Req() req: Request): Promise<{ received: boolean }> {
    const provider = req.params?.['provider'] || 'unknown';
    const method = req.method;
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || '-';

    this.logger.log(`[INBOUND] ${method} /webhook/${provider} from ${ip}`);
    this.logger.log(`[INBOUND][${provider}] User-Agent: ${userAgent}`);

    // Log semua headers yang relevan (kecuali auth sensitif)
    const loggableHeaders = Object.entries(req.headers)
      .filter(([k]) => !['authorization', 'cookie', 'x-api-key'].includes(k.toLowerCase()))
      .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {});
    this.logger.log(`[INBOUND][${provider}] Headers: ${JSON.stringify(loggableHeaders)}`);

    // Log query params jika ada
    if (Object.keys(req.query).length > 0) {
      this.logger.log(`[INBOUND][${provider}] Query: ${JSON.stringify(req.query)}`);
    }

    // Log body
    if (req.body && Object.keys(req.body).length > 0) {
      this.logger.log(`[INBOUND][${provider}] Body: ${JSON.stringify(req.body)}`);
    } else {
      this.logger.log(`[INBOUND][${provider}] Body: (empty)`);
    }

    return { received: true };
  }
}
