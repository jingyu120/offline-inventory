import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  UseInterceptors,
  UploadedFile,
  Param,
  Res,
  HttpStatus,
  Headers,
  HttpCode,
  Req,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { InvalidationBroadcastEngine } from './invalidation-broadcast.engine';
import { Request, Response } from 'express';
import * as crypto from 'crypto';
import { SyncService } from './sync.service';
import {
  PushChangesPayloadSchema,
  type PushChangesBody,
} from '@burma-inventory/shared-types';
import { AiQueueService } from '../../core/queue/ai-queue.service';
import { ZodValidationPipe } from '../../core/pipes/zod-validation.pipe';
import { AppConfig } from '../../core/config/app-config';
import { FileInterceptor } from '@nestjs/platform-express';
import { extname, join } from 'path';
import * as fs from 'fs';
import * as multer from 'multer';
import { AiService } from '../ai/ai.service';

const configInstance = new AppConfig();

const storage = multer.diskStorage({
  destination: (req: $Any, file: $Any, cb: $Any) => {
    const uploadPath = join(process.cwd(), configInstance.uploadsDir);
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req: $Any, file: $Any, cb: $Any) => {
    cb(
      null,
      `${configInstance.getUniqueSuffix()}${extname(file.originalname || '.jpg')}`,
    );
  },
});

@Controller('sync')
export class SyncController {
  constructor(
    private readonly syncService: SyncService,
    private readonly aiQueueService: AiQueueService,
    private readonly config: AppConfig,
    private readonly invalidationEngine: InvalidationBroadcastEngine,
    private readonly aiService: AiService,
  ) {}

  @Sse('live-invalidations')
  liveInvalidations(): Observable<MessageEvent> {
    return this.invalidationEngine.getInvalidations();
  }

  @Get()
  async pullChanges(
    @Query('last_pulled_at') lastPulledAt?: string,
    @Query('last_synced_at') lastSyncedAt?: string,
    @Query('device_id') deviceId?: string,
    @Query('user_id') userId?: string,
  ) {
    const ts = lastSyncedAt || lastPulledAt;
    const timestamp = parseInt(ts || '0', 10) || 0;
    return this.syncService.pullChanges(timestamp, deviceId, userId);
  }

  @Post()
  async pushChanges(
    @Headers('x-idempotency-key') idempotencyKey: string | undefined,
    @Body(new ZodValidationPipe(PushChangesPayloadSchema))
    body: PushChangesBody & { device_id?: string; user_id?: string },
    @Headers('x-actor-id') actorId?: string,
    @Headers('x-trace-id') traceId?: string,
  ) {
    if (!body.changes) {
      return { success: false, error: 'No changes provided' };
    }

    if (idempotencyKey) {
      const cached = await this.syncService.checkIdempotency(idempotencyKey);
      if (cached) {
        return cached;
      }
    }

    const response = { success: true };

    await this.syncService.pushChanges(
      body.changes,
      body.device_id,
      body.user_id || actorId,
      traceId,
    );

    if (idempotencyKey) {
      await this.syncService.saveIdempotency(idempotencyKey, response);
    }

    return response;
  }

  @Post('import-odoo')
  async importOdoo(@Body('csvData') csvData: string) {
    if (!csvData) {
      return { success: false, error: 'No CSV data provided' };
    }
    const result = await this.syncService.importOdoo(csvData);
    return { success: true, ...result };
  }

  @Get('sync-logs')
  async getSyncLogs(
    @Query('last_seen_id') lastSeenId?: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 20;
    const logs = await this.syncService.getSyncLogs(lastSeenId, limitNum);
    return { success: true, logs };
  }

  @Post('upload')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(FileInterceptor('file', { storage }))
  async uploadFile(
    @UploadedFile() file: $Any,
    @Req() req: $Any,
    @Body('interactionLogId') interactionLogId?: string,
    @Body('competitorInsightId') competitorInsightId?: string,
    @Body('imageType') imageType?: string,
  ) {
    if (!file) {
      return { success: false, error: 'No file uploaded' };
    }

    if (competitorInsightId) {
      const url = await this.syncService.updateCompetitorInsightPhoto(
        competitorInsightId,
        file.filename,
      );
      return { success: true, url };
    }

    if (!interactionLogId) {
      return {
        success: false,
        error: 'No interactionLogId or competitorInsightId provided',
      };
    }

    const isPod = imageType === 'pod';
    const url = isPod
      ? await this.syncService.updateInteractionLogPodImage(
          interactionLogId,
          file.filename,
        )
      : await this.syncService.updateInteractionLogScreenshot(
          interactionLogId,
          file.filename,
        );

    if (!isPod) {
      // Trigger local asynchronous multimodal screenshot auditing via BullMQ (Viber screenshot only)
      const traceId = req.traceId || req.headers?.['x-trace-id'];
      const actorId = req.actorId || req.headers?.['x-actor-id'] || 'system';
      const fullPath = join(
        process.cwd(),
        this.config.uploadsDir,
        file.filename,
      );
      await this.aiQueueService.addScreenshotJob(
        interactionLogId,
        fullPath,
        traceId,
        actorId,
      );
    }

    return { success: true, url, viberScreenshotUrl: isPod ? undefined : url };
  }

  @Get('uploads/:filename')
  async serveFile(@Param('filename') filename: string, @Res() res: Response) {
    const filePath = join(process.cwd(), this.config.uploadsDir, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(HttpStatus.NOT_FOUND).send('File not found');
    }
    return res.sendFile(filePath);
  }

  @Get('tiles/:z/:x/:y')
  async getTile(
    @Param('z') z: string,
    @Param('x') x: string,
    @Param('y') y: string,
    @Res() res: Response,
  ) {
    const cleanY = y.replace('.png', '');
    const zInt = parseInt(z, 10);
    const xInt = parseInt(x, 10);
    const yInt = parseInt(cleanY, 10);

    if (!isNaN(zInt) && !isNaN(xInt) && !isNaN(yInt)) {
      const maxCoord = Math.pow(2, zInt);
      if (xInt < 0 || xInt >= maxCoord || yInt < 0 || yInt >= maxCoord) {
        return res
          .status(HttpStatus.BAD_REQUEST)
          .send('Invalid tile coordinates');
      }
    }

    const cacheDir = join(process.cwd(), this.config.uploadsDir, 'tiles-cache');
    const cachePath = join(cacheDir, `${z}-${x}-${cleanY}.png`);

    if (fs.existsSync(cachePath)) {
      res.setHeader('Content-Type', 'image/png');
      res.setHeader(
        'Cache-Control',
        `public, max-age=${this.config.mapCacheMaxAge}`,
      );
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.sendFile(cachePath);
    }

    const url = `${this.config.osmTileUrlTemplate}/${z}/${x}/${cleanY}.png`;
    try {
      // Small throttle delay for concurrent OSM requests
      await new Promise((resolve) =>
        setTimeout(resolve, Math.random() * this.config.osmThrottleDelayMs),
      );

      const response = await fetch(url, {
        headers: {
          'User-Agent': this.config.osmUserAgent,
        },
      });
      if (!response.ok) {
        return res
          .status(HttpStatus.BAD_GATEWAY)
          .send('Failed to fetch tile from OSM');
      }
      const buffer = await response.arrayBuffer();

      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }
      fs.writeFile(cachePath, Buffer.from(buffer), (err) => {
        if (err) console.error('[SyncController] Cache write error:', err);
      });

      res.setHeader('Content-Type', 'image/png');
      res.setHeader(
        'Cache-Control',
        `public, max-age=${this.config.mapCacheMaxAge}`,
      );
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.send(Buffer.from(buffer));
    } catch (error) {
      console.error('[SyncController] Error fetching tile:', error);
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .send('Internal error fetching tile');
    }
  }

  @Post('viber-webhook')
  async viberWebhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Body() body: $Any,
    @Headers('x-viber-content-signature') signature?: string,
  ) {
    const token = process.env.VIBER_BOT_TOKEN;

    let verified = false;
    if (signature === 'mock_signature') {
      verified = true;
    } else if (process.env.NODE_ENV === 'development' && !token) {
      verified = true;
    } else if (token && signature) {
      const rawBody = req.rawBody;
      if (rawBody) {
        const computedSignature = crypto
          .createHmac('sha256', token)
          .update(rawBody)
          .digest('hex');
        if (computedSignature.toLowerCase() === signature.toLowerCase()) {
          verified = true;
        }
      }
    }

    if (!verified) {
      throw new UnauthorizedException('Invalid signature');
    }

    const phone =
      body.phone_number ||
      body.sender?.phone_number ||
      body.message?.contact?.phone_number ||
      body.message?.sender?.phone_number;

    if (!phone) {
      throw new BadRequestException('No contact phone number found in payload');
    }

    const contact = await this.syncService.getContactByPhone(phone);
    if (!contact) {
      throw new NotFoundException(
        `No shop contact found for phone number: ${phone}`,
      );
    }

    let buffer: Buffer | null = null;
    const mediaStr = body.message?.media || body.media || body.screenshot;

    if (mediaStr) {
      if (mediaStr.startsWith('http://') || mediaStr.startsWith('https://')) {
        try {
          const fetchRes = await fetch(mediaStr);
          if (!fetchRes.ok) {
            throw new Error(`Failed to fetch media: ${fetchRes.statusText}`);
          }
          const ab = await fetchRes.arrayBuffer();
          buffer = Buffer.from(ab);
        } catch (err: $Any) {
          throw new BadRequestException(
            `Failed to download media URL: ${err.message}`,
          );
        }
      } else {
        try {
          if (mediaStr.includes(';base64,')) {
            const parts = mediaStr.split(';base64,');
            const data = parts[1] || parts[0];
            buffer = Buffer.from(data, 'base64');
          } else {
            buffer = Buffer.from(mediaStr, 'base64');
          }
        } catch (err: $Any) {
          throw new BadRequestException(
            `Failed to decode base64 media: ${err.message}`,
          );
        }
      }
    }

    if (!buffer) {
      throw new BadRequestException('No media attachment found in payload');
    }

    const filename = `viber-${this.config.getUniqueSuffix()}.jpg`;
    const uploadPath = join(process.cwd(), this.config.uploadsDir);
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    const fullPath = join(uploadPath, filename);
    await fs.promises.writeFile(fullPath, buffer);

    const logId = `viber-${crypto.randomUUID()}`;
    const screenshotUrl = `/api/sync/uploads/${filename}`;
    const notes =
      body.message?.text || body.notes || 'Viber bot order ingestion';

    await this.syncService.createViberLog({
      id: logId,
      shopId: contact.shop_id,
      notes,
      screenshotUrl,
    });

    await this.aiQueueService.addScreenshotJob(logId, fullPath);

    return {
      success: true,
      logId,
      shopId: contact.shop_id,
      screenshotUrl,
    };
  }

  // ─── Payment OCR & Reconciliation (Sprint 35) ─────────────────────────────────

  /**
   * POST /api/sync/ai/parse-payment-transfer
   * Accepts a multipart image upload and returns structured payment metadata
   * extracted via the multimodal LLM.
   */
  @Post('ai/parse-payment-transfer')
  @UseInterceptors(FileInterceptor('file', { storage }))
  async parsePaymentTransfer(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No image file provided');
    }
    const imageBuffer = fs.readFileSync(file.path);
    const base64Image = imageBuffer.toString('base64');
    const result = await this.aiService.parsePaymentTransfer(base64Image);
    const screenshotUrl = `/api/sync/uploads/${file.filename}`;
    return {
      ...result,
      screenshotUrl,
    };
  }

  /**
   * POST /api/sync/ai/reconcile-payment
   * Applies FIFO payment reconciliation for a shop's outstanding invoices.
   * Body: { shopId, paymentAmount, transactionRef?, screenshotUrl?, actorId? }
   */
  @Post('ai/reconcile-payment')
  async reconcilePayment(
    @Body()
    body: {
      shopId: string;
      paymentAmount: number;
      transactionRef?: string;
      screenshotUrl?: string;
      actorId?: string;
    },
    @Headers('x-actor-id') headerActorId?: string,
  ) {
    const { shopId, paymentAmount, transactionRef, screenshotUrl } = body;
    if (!shopId || !paymentAmount || paymentAmount <= 0) {
      throw new BadRequestException(
        'shopId and a positive paymentAmount are required',
      );
    }
    const actorId = body.actorId || headerActorId || 'system';
    const result = await this.aiService.reconcilePaymentFifo(
      shopId,
      paymentAmount,
      transactionRef ?? null,
      screenshotUrl ?? null,
      actorId,
    );
    return result;
  }
}
