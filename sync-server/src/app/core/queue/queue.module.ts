import { Module, forwardRef } from '@nestjs/common';
import { AiModule } from '../../features/ai/ai.module';
import { AiQueueService } from './ai-queue.service';
import { AiWorker } from './ai.worker';

@Module({
  imports: [forwardRef(() => AiModule)],
  providers: [AiQueueService, AiWorker],
  exports: [AiQueueService],
})
export class QueueModule {}
