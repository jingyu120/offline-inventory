import { Module } from '@nestjs/common';
import { SyncModule } from '../../features/sync/sync.module';
import { AiModule } from '../../features/ai/ai.module';
import { QueueModule } from '../queue/queue.module';
import { TrpcRouter } from './trpc.router';
import { TrpcController } from './trpc.controller';

@Module({
  imports: [SyncModule, AiModule, QueueModule],
  controllers: [TrpcController],
  providers: [TrpcRouter],
})
export class TrpcModule {}
