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
} from '@nestjs/common';
import { SyncService } from './sync.service';
import type { PushChangesBody } from '@burma-inventory/shared-types';
import { FileInterceptor } from '@nestjs/platform-express';
import { extname, join } from 'path';
import { Response } from 'express';
import * as fs from 'fs';

import * as multer from 'multer';

const storage = multer.diskStorage({
  destination: (req: any, file: any, cb: any) => {
    const uploadPath = join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req: any, file: any, cb: any) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}${extname(file.originalname || '.jpg')}`);
  },
});

@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Get()
  async pullChanges(
    @Query('last_pulled_at') lastPulledAt: string,
    @Query('device_id') deviceId?: string,
    @Query('user_id') userId?: string,
  ) {
    const timestamp = parseInt(lastPulledAt, 10) || 0;
    return this.syncService.pullChanges(timestamp, deviceId, userId);
  }

  @Post()
  async pushChanges(
    @Body() body: PushChangesBody & { device_id?: string; user_id?: string },
  ) {
    if (!body.changes) {
      return { success: false, error: 'No changes provided' };
    }
    await this.syncService.pushChanges(
      body.changes,
      body.device_id,
      body.user_id,
    );
    return { success: true };
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
  async getSyncLogs() {
    const logs = await this.syncService.getSyncLogs();
    return { success: true, logs };
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { storage }))
  async uploadFile(
    @UploadedFile() file: any,
    @Body('interactionLogId') interactionLogId: string,
  ) {
    if (!file) {
      return { success: false, error: 'No file uploaded' };
    }
    if (!interactionLogId) {
      return { success: false, error: 'No interactionLogId provided' };
    }

    const url = await this.syncService.updateInteractionLogScreenshot(
      interactionLogId,
      file.filename,
    );

    return { success: true, viberScreenshotUrl: url };
  }

  @Get('uploads/:filename')
  async serveFile(@Param('filename') filename: string, @Res() res: Response) {
    const filePath = join(process.cwd(), 'uploads', filename);
    if (!fs.existsSync(filePath)) {
      return res.status(HttpStatus.NOT_FOUND).send('File not found');
    }
    return res.sendFile(filePath);
  }
}
