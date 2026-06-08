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
          } else if (name === 'parse-payment-transfer') {
            const { base64Image } = data;
            const result =
              await this.aiService.parsePaymentTransfer(base64Image);
            console.log(
              `[AiWorker] Payment transfer parsed: confidence=${result.confidence}, amount=${result.amount}, txId=${result.transactionId}`,
            );
          } else if (name === 'eod-digest') {
            const { dateStr } = data;
            await this.aiService.generateEodDigest(dateStr);
          } else if (name === 'corrupted-transaction') {
            const { reason, payload } = data;
            await this.sendSecurityAlert(reason, payload);
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

  private async sendSecurityAlert(
    reason: string,
    payload: unknown,
  ): Promise<void> {
    const message = `🚨 *Security Alert: Corrupted Transaction Detected* 🚨\n*Reason:* ${reason}\n*Payload:* ${JSON.stringify(payload)}`;
    console.error(`[SECURITY ALERT] ${message}`);

    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (webhookUrl && typeof fetch !== 'undefined') {
      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: message }),
        });
        if (!response.ok) {
          console.error(
            `[AiWorker] Slack webhook failed with status ${response.status}: ${await response.text()}`,
          );
        } else {
          console.log('[AiWorker] Slack webhook alert sent successfully.');
        }
      } catch (err) {
        console.error('[AiWorker] Failed to send Slack webhook alert:', err);
      }
    } else {
      console.log(
        '[AiWorker] SLACK_WEBHOOK_URL not configured. Skipping Slack alert.',
      );
    }
  }

  async onModuleDestroy() {
    await this.worker.close();
  }
}
