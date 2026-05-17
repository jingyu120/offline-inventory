import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma';
import { SyncModule } from './sync/sync.module';
import { HealthController } from './health.controller';

@Module({
  imports: [PrismaModule, SyncModule],
  controllers: [HealthController],
})
export class AppModule {}
