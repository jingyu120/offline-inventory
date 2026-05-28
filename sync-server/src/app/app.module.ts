import { Module } from '@nestjs/common';
import { ConfigModule } from './core/config/config.module';
import { DrizzleModule } from './core/drizzle';
import { SyncModule } from './features/sync/sync.module';
import { AiModule } from './features/ai/ai.module';
import { HealthController } from './features/health/health.controller';
import { TrpcModule } from './core/trpc/trpc.module';

@Module({
  imports: [ConfigModule, DrizzleModule, SyncModule, AiModule, TrpcModule],
  controllers: [HealthController],
})
export class AppModule {}
