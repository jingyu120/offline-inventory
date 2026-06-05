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

  async addScreenshotJob(
    interactionLogId: string,
    filePath: string,
    traceId?: string,
    actorId?: string,
  ) {
    await this.queue.add('process-screenshot', {
      interactionLogId,
      filePath,
      traceId,
      actorId,
    });
  }

  async addEodJob(dateStr: string) {
    await this.queue.add('eod-digest', {
      dateStr,
    });
  }

  async addCorruptedTransactionJob(
    reason: string,
    payload: unknown,
    traceId?: string,
    actorId?: string,
  ) {
    await this.queue.add('corrupted-transaction', {
      reason,
      payload,
      traceId,
      actorId,
    });
  }

  async getFailedJobs() {
    const jobs = await this.queue.getFailed(0, 100);
    return jobs.map((j) => ({
      id: j.id,
      name: j.name,
      data: j.data,
      failedReason: j.failedReason,
      stacktrace: j.stacktrace,
      timestamp: j.timestamp,
    }));
  }

  async updateJobData(jobId: string, data: $Any) {
    const job = await this.queue.getJob(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);
    await job.updateData(data);
    return { success: true };
  }

  async retryJob(jobId: string) {
    const job = await this.queue.getJob(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);
    await job.retry();
    return { success: true };
  }

  async removeJob(jobId: string) {
    const job = await this.queue.getJob(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);
    await job.remove();
    return { success: true };
  }

  async onModuleDestroy() {
    await this.queue.close();
  }
}
