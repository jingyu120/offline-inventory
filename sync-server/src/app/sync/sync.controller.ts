import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import { SyncService } from './sync.service';
import type { PushChangesBody } from '@burma-inventory/shared-types';

@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Get()
  async pullChanges(@Query('last_pulled_at') lastPulledAt: string) {
    const timestamp = parseInt(lastPulledAt, 10) || 0;
    return this.syncService.pullChanges(timestamp);
  }

  @Post()
  async pushChanges(@Body() body: PushChangesBody) {
    if (!body.changes) {
      return { success: false, error: 'No changes provided' };
    }
    await this.syncService.pushChanges(body.changes);
    return { success: true };
  }
}
