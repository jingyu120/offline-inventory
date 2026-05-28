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
} from '@nestjs/common';
import { SyncService } from './sync.service';
import { PushChangesPayloadSchema } from '@burma-inventory/shared-types';
import type { PushChangesBody } from '@burma-inventory/shared-types';
import { AiQueueService } from '../../core/queue/ai-queue.service';
import { ZodValidationPipe } from '../../core/pipes/zod-validation.pipe';
import { AppConfig } from '../../core/config/app-config';
import { FileInterceptor } from '@nestjs/platform-express';
import { extname, join } from 'path';
import { Response } from 'express';
import * as fs from 'fs';
import * as multer from 'multer';

const configInstance = new AppConfig();

const storage = multer.diskStorage({
  destination: (req: any, file: any, cb: any) => {
    const uploadPath = join(process.cwd(), configInstance.uploadsDir);
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req: any, file: any, cb: any) => {
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
  ) {}

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
      body.user_id,
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
    @UploadedFile() file: any,
    @Body('interactionLogId') interactionLogId?: string,
    @Body('competitorInsightId') competitorInsightId?: string,
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

    const url = await this.syncService.updateInteractionLogScreenshot(
      interactionLogId,
      file.filename,
    );

    // Trigger local asynchronous multimodal screenshot auditing via BullMQ
    const fullPath = join(process.cwd(), this.config.uploadsDir, file.filename);
    await this.aiQueueService.addScreenshotJob(interactionLogId, fullPath);

    return { success: true, viberScreenshotUrl: url };
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
}
