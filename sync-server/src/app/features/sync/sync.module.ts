import { Module } from '@nestjs/common';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { DrizzleModule } from '../../core/drizzle';
import { AiModule } from '../ai/ai.module';
import { QueueModule } from '../../core/queue/queue.module';
import { OdooImporterService } from './odoo-importer.service';
import { ConflictResolutionService } from './conflict/conflict-resolution.service';
import { AnomalyDetectionService } from './anomaly/anomaly-detection.service';

@Module({
  imports: [DrizzleModule, AiModule, QueueModule],
  controllers: [SyncController],
  providers: [
    SyncService,
    OdooImporterService,
    ConflictResolutionService,
    AnomalyDetectionService,
  ],
  exports: [SyncService, OdooImporterService],
})
export class SyncModule {}
