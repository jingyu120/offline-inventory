import { initTRPC } from '@trpc/server';
import { z } from 'zod';

const t = initTRPC.create();

// Registry of resolvers to decouple server implementation from types
// Bound to globalThis to prevent instance mismatch under dual-package or bundler-resolution dual loading
const globalResolvers = (globalThis as Record<string, unknown>)[
  '__trpcResolvers'
] || {
  getSyncLogs: null,
  quotaOptimizations: null,
  eodDigest: null,
  analyzeSentiment: null,
  getMismatchLogs: null,
  resolveMismatchLog: null,
  getFailedJobs: null,
  updateJobData: null,
  retryJob: null,
  removeJob: null,
};

(globalThis as Record<string, unknown>)['__trpcResolvers'] = globalResolvers;

export const trpcResolvers = globalResolvers as {
  getSyncLogs:
    | null
    | ((input: { lastSeenId?: string; limit: number }) => Promise<{
        success: boolean;
        logs: {
          id: string;
          device_id: string;
          user_id: string | null;
          action: string;
          records_pulled: number;
          records_pushed: number;
          status: string;
          error_message: string | null;
          created_at: number;
          createdAt: Date;
          user: { id: string; username: string; role: string } | null;
        }[];
      }>);
  quotaOptimizations:
    | null
    | (() => Promise<
        {
          region: string;
          currentQuota: number;
          suggestedQuota: number;
          reason: string;
        }[]
      >);
  eodDigest:
    | null
    | ((input: { date?: string }) => Promise<{
        date: string;
        compiledAt: Date;
        topPerformingRep: string;
        complianceScorecard: {
          repId: string;
          username: string;
          totalLogs: number;
          quotaTarget: number;
          complianceStatus: 'GREEN' | 'YELLOW' | 'RED';
          batchDumpingFlagged: boolean;
        }[];
        warnings: string[];
        marketSynthesis: unknown;
      }>);
  analyzeSentiment:
    | null
    | ((input: { notes: string[] }) => Promise<{
        sentimentTrend: 'IMPROVING' | 'STABLE' | 'DECLINING';
        explanation: string;
      }>);
  getMismatchLogs: null | (() => Promise<unknown[]>);
  resolveMismatchLog:
    | null
    | ((input: {
        logId: string;
        shopId: string;
        notes: string;
        items: {
          itemId: string;
          quantity: number;
          unitPrice: number;
          selectedUnit: string;
          stockCondition: string;
        }[];
      }) => Promise<{ success: boolean }>);
  getFailedJobs:
    | null
    | (() => Promise<
        {
          id?: string;
          name: string;
          data: unknown;
          failedReason?: string;
          stacktrace?: string[] | null;
          timestamp: number;
        }[]
      >);
  updateJobData:
    | null
    | ((input: {
        jobId: string;
        data: unknown;
      }) => Promise<{ success: boolean }>);
  retryJob:
    | null
    | ((input: { jobId: string }) => Promise<{ success: boolean }>);
  removeJob:
    | null
    | ((input: { jobId: string }) => Promise<{ success: boolean }>);
};

export const appRouter = t.router({
  getSyncLogs: t.procedure
    .input(
      z.object({
        lastSeenId: z.string().optional(),
        limit: z.number().default(20),
      }),
    )
    .query(async ({ input }) => {
      if (!trpcResolvers.getSyncLogs)
        throw new Error('Resolver not registered');
      return trpcResolvers.getSyncLogs(input);
    }),
  quotaOptimizations: t.procedure.query(async () => {
    if (!trpcResolvers.quotaOptimizations)
      throw new Error('Resolver not registered');
    return trpcResolvers.quotaOptimizations();
  }),
  eodDigest: t.procedure
    .input(
      z.object({
        date: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      if (!trpcResolvers.eodDigest) throw new Error('Resolver not registered');
      return trpcResolvers.eodDigest(input);
    }),
  analyzeSentiment: t.procedure
    .input(
      z.object({
        notes: z.array(z.string()),
      }),
    )
    .mutation(async ({ input }) => {
      if (!trpcResolvers.analyzeSentiment)
        throw new Error('Resolver not registered');
      return trpcResolvers.analyzeSentiment(input);
    }),
  getMismatchLogs: t.procedure.query(async () => {
    if (!trpcResolvers.getMismatchLogs)
      throw new Error('Resolver not registered');
    return trpcResolvers.getMismatchLogs();
  }),
  resolveMismatchLog: t.procedure
    .input(
      z.object({
        logId: z.string(),
        shopId: z.string(),
        notes: z.string(),
        items: z.array(
          z.object({
            itemId: z.string(),
            quantity: z.number(),
            unitPrice: z.number(),
            selectedUnit: z.string().default('PCS'),
            stockCondition: z.string().default('GOOD'),
          }),
        ),
      }),
    )
    .mutation(async ({ input }) => {
      if (!trpcResolvers.resolveMismatchLog)
        throw new Error('Resolver not registered');
      return trpcResolvers.resolveMismatchLog(input);
    }),
  getFailedJobs: t.procedure.query(async () => {
    if (!trpcResolvers.getFailedJobs)
      throw new Error('Resolver not registered');
    return trpcResolvers.getFailedJobs();
  }),
  updateJobData: t.procedure
    .input(
      z.object({
        jobId: z.string(),
        data: z.unknown(),
      }),
    )
    .mutation(async ({ input }) => {
      if (!trpcResolvers.updateJobData)
        throw new Error('Resolver not registered');
      return trpcResolvers.updateJobData(input);
    }),
  retryJob: t.procedure
    .input(
      z.object({
        jobId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      if (!trpcResolvers.retryJob) throw new Error('Resolver not registered');
      return trpcResolvers.retryJob(input);
    }),
  removeJob: t.procedure
    .input(
      z.object({
        jobId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      if (!trpcResolvers.removeJob) throw new Error('Resolver not registered');
      return trpcResolvers.removeJob(input);
    }),
});

export type AppRouter = typeof appRouter;
