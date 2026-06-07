import { Module } from '@nestjs/common';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { DrizzleModule } from '../../core/drizzle';
import { AiModule } from '../ai/ai.module';
import { QueueModule } from '../../core/queue/queue.module';
import { OdooImporterService } from './odoo-importer.service';

@Module({
  imports: [DrizzleModule, AiModule, QueueModule],
  controllers: [SyncController],
  providers: [SyncService, OdooImporterService],
  exports: [SyncService, OdooImporterService],
})
export class SyncModule {}
