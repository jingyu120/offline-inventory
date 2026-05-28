import { initTRPC } from '@trpc/server';
import { z } from 'zod';

const t = initTRPC.create();

// Registry of resolvers to decouple server implementation from types
export const trpcResolvers = {
  getSyncLogs: null as
    | null
    | ((input: { lastSeenId?: string; limit: number }) => Promise<any>),
  quotaOptimizations: null as null | (() => Promise<any>),
  eodDigest: null as null | ((input: { date?: string }) => Promise<any>),
  analyzeSentiment: null as
    | null
    | ((input: { notes: string[] }) => Promise<any>),
  getMismatchLogs: null as null | (() => Promise<any>),
  resolveMismatchLog: null as
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
      }) => Promise<any>),
  getFailedJobs: null as null | (() => Promise<any>),
  updateJobData: null as
    | null
    | ((input: { jobId: string; data: any }) => Promise<any>),
  retryJob: null as null | ((input: { jobId: string }) => Promise<any>),
  removeJob: null as null | ((input: { jobId: string }) => Promise<any>),
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
        data: z.any(),
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
