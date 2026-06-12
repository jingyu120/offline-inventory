import { Injectable, OnModuleInit } from '@nestjs/common';
import { SyncService } from '../../features/sync/sync.service';
import { AiService } from '../../features/ai/ai.service';
import { AiQueueService } from '../queue/ai-queue.service';
import { DrizzleService } from '../drizzle/drizzle.service';
import { trpcResolvers } from '@burma-inventory/shared-types/server';
import { requestStorage } from './request-context';
import { TRPCError } from '@trpc/server';

@Injectable()
export class TrpcRouter implements OnModuleInit {
  constructor(
    private readonly syncService: SyncService,
    private readonly aiService: AiService,
    private readonly aiQueueService: AiQueueService,
    private readonly drizzleService: DrizzleService,
  ) {}

  private validateRequest(resolverName: string, input: unknown) {
    const req = requestStorage.getStore();
    if (!req) return;

    const traceId = req.headers['x-trace-id'];
    const hashChain = req.headers['x-hash-chain'];

    let isInvalid = false;
    let reason = '';

    if (!traceId || typeof traceId !== 'string' || traceId.trim() === '') {
      isInvalid = true;
      reason = 'Missing or empty x-trace-id header';
    } else if (
      !hashChain ||
      typeof hashChain !== 'string' ||
      (hashChain !== 'genesis' &&
        (hashChain.length !== 64 || !/^[0-9a-f]{64}$/.test(hashChain)))
    ) {
      isInvalid = true;
      reason =
        'Missing or invalid cryptographic x-hash-chain header (expected 64-character SHA-256 hex string)';
    }

    if (isInvalid) {
      const traceIdStr = typeof traceId === 'string' ? traceId : undefined;
      // Pipe corrupted transaction frame directly into BullMQ DLQ
      this.aiQueueService
        .addCorruptedTransactionJob(
          reason,
          {
            resolver: resolverName,
            input,
            headers: req.headers,
            url: req.url,
            method: req.method,
          },
          traceIdStr,
        )
        .catch((err) => {
          console.error(
            '[TrpcRouter] Failed to push corrupted transaction to DLQ queue:',
            err,
          );
        });

      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Trace validation failed: ${reason}`,
      });
    }
  }

  onModuleInit() {
    trpcResolvers.seedDatabase = async () => {
      this.validateRequest('seedDatabase', undefined);
      await this.drizzleService.runDeterministicSeeding();
      return { success: true };
    };

    trpcResolvers.getSyncLogs = async (input) => {
      this.validateRequest('getSyncLogs', input);
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
      this.validateRequest('quotaOptimizations', undefined);
      return this.aiService.getDynamicQuotaOptimizations();
    };

    trpcResolvers.eodDigest = async (input) => {
      this.validateRequest('eodDigest', input);
      const dateStr = input.date || new Date().toISOString().split('T')[0];
      return this.aiService.generateEodDigest(dateStr);
    };

    trpcResolvers.analyzeSentiment = async (input) => {
      this.validateRequest('analyzeSentiment', input);
      return this.aiService.analyzeSentiment(input.notes);
    };

    // HITL Mismatches
    trpcResolvers.getMismatchLogs = async () => {
      this.validateRequest('getMismatchLogs', undefined);
      return this.syncService.getMismatchLogs();
    };

    trpcResolvers.resolveMismatchLog = async (input) => {
      this.validateRequest('resolveMismatchLog', input);
      return this.syncService.resolveMismatchLog(input);
    };

    // DLQ Monitor
    trpcResolvers.getFailedJobs = async () => {
      this.validateRequest('getFailedJobs', undefined);
      return this.aiQueueService.getFailedJobs();
    };

    trpcResolvers.updateJobData = async (input) => {
      this.validateRequest('updateJobData', input);
      return this.aiQueueService.updateJobData(input.jobId, input.data);
    };

    trpcResolvers.retryJob = async (input) => {
      this.validateRequest('retryJob', input);
      return this.aiQueueService.retryJob(input.jobId);
    };

    trpcResolvers.removeJob = async (input) => {
      this.validateRequest('removeJob', input);
      return this.aiQueueService.removeJob(input.jobId);
    };

    trpcResolvers.sync = {
      pull: async (input) => {
        this.validateRequest('sync.pull', input);
        return this.syncService.pullChanges(
          input.lastPulledAt,
          input.deviceId,
          input.userId,
          input.targetTable,
        );
      },
      push: async (input) => {
        this.validateRequest('sync.push', input);
        await this.syncService.pushChanges(
          input.changes,
          input.deviceId,
          input.userId,
        );
        return { success: true };
      },
    };
  }
}
