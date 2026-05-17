import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma';
import { SyncModule } from './sync/sync.module';
import { AiModule } from './ai/ai.module';
import { HealthController } from './health.controller';

@Module({
  imports: [PrismaModule, SyncModule, AiModule],
  controllers: [HealthController],
})
export class AppModule {}
