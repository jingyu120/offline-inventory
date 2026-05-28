import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import { env } from '../../../env';

@Injectable()
export class AiQueueService implements OnModuleDestroy {
  public readonly queue: Queue;

  constructor() {
    this.queue = new Queue('ai-tasks', {
      connection: {
        url: env.REDIS_URL,
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    });
  }

  async addScreenshotJob(interactionLogId: string, filePath: string) {
    await this.queue.add('process-screenshot', {
      interactionLogId,
      filePath,
    });
  }

  async addEodJob(dateStr: string) {
    await this.queue.add('eod-digest', {
      dateStr,
    });
  }

  async onModuleDestroy() {
    await this.queue.close();
  }
}
