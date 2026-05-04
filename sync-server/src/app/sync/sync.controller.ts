import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import { SyncService } from './sync.service';

@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Get()
  async pullChanges(@Query('last_pulled_at') lastPulledAt: string) {
    const timestamp = parseInt(lastPulledAt, 10) || 0;
    return this.syncService.pullChanges(timestamp);
  }

  @Post()
  async pushChanges(@Body() body: any) {
    const { changes } = body;
    if (!changes) {
      return { success: false, error: 'No changes provided' };
    }
    
    await this.syncService.pushChanges(changes);
    return { success: true };
  }
}
