import { Module } from '@nestjs/common';
import { ConfigModule } from './core/config/config.module';
import { PrismaModule } from './core/prisma';
import { SyncModule } from './features/sync/sync.module';
import { AiModule } from './features/ai/ai.module';
import { HealthController } from './features/health/health.controller';

@Module({
  imports: [ConfigModule, PrismaModule, SyncModule, AiModule],
  controllers: [HealthController],
})
export class AppModule {}
