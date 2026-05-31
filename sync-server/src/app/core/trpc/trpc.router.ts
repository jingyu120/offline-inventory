import { Injectable, OnModuleInit } from '@nestjs/common';
import { SyncService } from '../../features/sync/sync.service';
import { AiService } from '../../features/ai/ai.service';
import { AiQueueService } from '../queue/ai-queue.service';
import { trpcResolvers } from '@burma-inventory/shared-types/server';

@Injectable()
export class TrpcRouter implements OnModuleInit {
  constructor(
    private readonly syncService: SyncService,
    private readonly aiService: AiService,
    private readonly aiQueueService: AiQueueService,
  ) {}

  onModuleInit() {
    console.log('[TrpcRouter] Registering tRPC resolvers...');
    trpcResolvers.getSyncLogs = async (input) => {
      const logs = await this.syncService.getSyncLogs(
        input.lastSeenId,
        input.limit,
      );
      return {
        success: true,
        logs,
      };
    };

    trpcResolvers.quotaOptimizations = async () => {
      return this.aiService.getDynamicQuotaOptimizations();
    };

    trpcResolvers.eodDigest = async (input) => {
      const dateStr = input.date || new Date().toISOString().split('T')[0];
      return this.aiService.generateEodDigest(dateStr);
    };

    trpcResolvers.analyzeSentiment = async (input) => {
      return this.aiService.analyzeSentiment(input.notes);
    };

    // HITL Mismatches
    trpcResolvers.getMismatchLogs = async () => {
      return this.syncService.getMismatchLogs();
    };

    trpcResolvers.resolveMismatchLog = async (input) => {
      return this.syncService.resolveMismatchLog(input);
    };

    // DLQ Monitor
    trpcResolvers.getFailedJobs = async () => {
      return this.aiQueueService.getFailedJobs();
    };

    trpcResolvers.updateJobData = async (input) => {
      return this.aiQueueService.updateJobData(input.jobId, input.data);
    };

    trpcResolvers.retryJob = async (input) => {
      return this.aiQueueService.retryJob(input.jobId);
    };

    trpcResolvers.removeJob = async (input) => {
      return this.aiQueueService.removeJob(input.jobId);
    };
  }
}
