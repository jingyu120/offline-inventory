import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import { env } from '../../../env';
import { AiService } from '../../features/ai/ai.service';

@Injectable()
export class AiWorker implements OnModuleInit, OnModuleDestroy {
  private worker!: Worker;

  constructor(private readonly aiService: AiService) {}

  onModuleInit() {
    this.worker = new Worker(
      'ai-tasks',
      async (job: Job) => {
        const { name, data } = job;
        console.log(`[AiWorker] Processing job ${job.id} (${name})`);
        try {
          if (name === 'process-screenshot') {
            const { interactionLogId, filePath, traceId, actorId } = data;
            await this.aiService.processScreenshot(
              interactionLogId,
              filePath,
              traceId,
              actorId,
            );
          } else if (name === 'eod-digest') {
            const { dateStr } = data;
            await this.aiService.generateEodDigest(dateStr);
          } else if (name === 'corrupted-transaction') {
            const { reason, payload } = data;
            throw new Error(
              `Corrupted Transaction Frame: ${reason}. Payload: ${JSON.stringify(payload)}`,
            );
          } else {
            console.warn(`[AiWorker] Unknown job name: ${name}`);
          }
        } catch (error) {
          console.error(`[AiWorker] Job ${job.id} failed:`, error);
          throw error;
        }
      },
      {
        connection: {
          url: env.REDIS_URL,
        },
        concurrency: 1, // run tasks sequentially to protect main loop / CPU
      },
    );

    this.worker.on('completed', (job) => {
      console.log(`[AiWorker] Job ${job.id} completed.`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`[AiWorker] Job ${job?.id} failed:`, err);
    });
  }

  async onModuleDestroy() {
    await this.worker.close();
  }
}
