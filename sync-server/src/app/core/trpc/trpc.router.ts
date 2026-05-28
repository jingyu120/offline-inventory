import { Injectable, OnModuleInit } from '@nestjs/common';
import { SyncService } from '../../features/sync/sync.service';
import { AiService } from '../../features/ai/ai.service';
import { trpcResolvers } from '@burma-inventory/shared-types';

@Injectable()
export class TrpcRouter implements OnModuleInit {
  constructor(
    private readonly syncService: SyncService,
    private readonly aiService: AiService,
  ) {}

  onModuleInit() {
    trpcResolvers.getSyncLogs = async (input) => {
      return this.syncService.getSyncLogs(input.lastSeenId, input.limit);
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
  }
}
