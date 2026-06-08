import { Global, Module } from '@nestjs/common';
import { ConfigModule } from './core/config/config.module';
import { DrizzleModule } from './core/drizzle';
import { SyncModule } from './features/sync/sync.module';
import { AiModule } from './features/ai/ai.module';
import { HealthController } from './features/health/health.controller';
import { TrpcModule } from './core/trpc/trpc.module';
import { AuthModule } from './core/auth/auth.module';
import { InvalidationBroadcastEngine } from './features/sync/invalidation-broadcast.engine';

@Global()
@Module({
  providers: [InvalidationBroadcastEngine],
  exports: [InvalidationBroadcastEngine],
})
export class InvalidationModule {}

@Module({
  imports: [
    ConfigModule,
    DrizzleModule,
    InvalidationModule,
    SyncModule,
    AiModule,
    TrpcModule,
    AuthModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
