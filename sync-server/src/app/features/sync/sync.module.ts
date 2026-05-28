import { Module } from '@nestjs/common';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { DrizzleModule } from '../../core/drizzle';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [DrizzleModule, AiModule],
  controllers: [SyncController],
  providers: [SyncService],
  exports: [SyncService],
})
export class SyncModule {}
