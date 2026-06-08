import { Test, TestingModule } from '@nestjs/testing';
import { TrpcRouter } from './trpc.router';
import { TrpcController } from './trpc.controller';
import { SyncService } from '../../features/sync/sync.service';
import { AiService } from '../../features/ai/ai.service';
import { AiQueueService } from '../queue/ai-queue.service';
import { DrizzleService } from '../drizzle/drizzle.service';
import { trpcResolvers } from '@burma-inventory/shared-types/server';
import { requestStorage } from './request-context';
import { TRPCError } from '@trpc/server';

// Mock the express middleware adapter
const mockMiddlewareHandler = jest.fn();
jest.mock('@trpc/server/adapters/express', () => ({
  createExpressMiddleware: jest.fn().mockImplementation(() => {
    return (req: any, res: any, next: any) =>
      mockMiddlewareHandler(req, res, next);
  }),
}));

describe('TrpcRouter & TrpcController', () => {
  let router: TrpcRouter;
  let controller: TrpcController;

  const mockSyncService = {
    getSyncLogs: jest.fn().mockResolvedValue([]),
    getMismatchLogs: jest.fn().mockResolvedValue([]),
    resolveMismatchLog: jest.fn().mockResolvedValue({ success: true }),
    pullChanges: jest.fn().mockResolvedValue({ changes: {}, timestamp: 12345 }),
    pushChanges: jest.fn().mockResolvedValue(undefined),
  };

  const mockAiService = {
    getDynamicQuotaOptimizations: jest.fn().mockResolvedValue([]),
    generateEodDigest: jest.fn().mockResolvedValue({}),
    analyzeSentiment: jest.fn().mockResolvedValue({}),
  };

  const mockAiQueueService = {
    addCorruptedTransactionJob: jest.fn().mockResolvedValue({}),
    getFailedJobs: jest.fn().mockResolvedValue([]),
    updateJobData: jest.fn().mockResolvedValue({ success: true }),
    retryJob: jest.fn().mockResolvedValue({ success: true }),
    removeJob: jest.fn().mockResolvedValue({ success: true }),
  };

  const mockDrizzleService = {
    runDeterministicSeeding: jest.fn().mockResolvedValue(undefined),
  };

  const resolvers = trpcResolvers as $Any;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TrpcController],
      providers: [
        TrpcRouter,
        { provide: SyncService, useValue: mockSyncService },
        { provide: AiService, useValue: mockAiService },
        { provide: AiQueueService, useValue: mockAiQueueService },
        { provide: DrizzleService, useValue: mockDrizzleService },
      ],
    }).compile();

    router = module.get<TrpcRouter>(TrpcRouter);
    controller = module.get<TrpcController>(TrpcController);
  });

  describe('TrpcRouter', () => {
    beforeEach(() => {
      router.onModuleInit();
    });

    it('should be defined', () => {
      expect(router).toBeDefined();
    });

    it('passes validation when request context is not present', async () => {
      // No request context is run (e.g. CLI or background task execution)
      await expect(resolvers.getSyncLogs({ limit: 10 })).resolves.toBeDefined();
      expect(mockSyncService.getSyncLogs).toHaveBeenCalledWith(undefined, 10);
    });

    it('passes validation when request contains valid headers', async () => {
      const mockReq = {
        headers: {
          'x-trace-id': 'trace-1234',
          'x-hash-chain': 'a'.repeat(64),
        },
        url: '/getSyncLogs',
        method: 'GET',
      } as any;

      await requestStorage.run(mockReq, async () => {
        const res = await resolvers.getSyncLogs({ limit: 20 });
        expect(res.success).toBe(true);
      });

      expect(mockSyncService.getSyncLogs).toHaveBeenCalledWith(undefined, 20);
    });

    it('passes validation when request contains genesis hash chain', async () => {
      const mockReq = {
        headers: {
          'x-trace-id': 'trace-1234',
          'x-hash-chain': 'genesis',
        },
        url: '/getSyncLogs',
        method: 'GET',
      } as any;

      await requestStorage.run(mockReq, async () => {
        const res = await resolvers.getSyncLogs({ limit: 20 });
        expect(res.success).toBe(true);
      });

      expect(mockSyncService.getSyncLogs).toHaveBeenCalledWith(undefined, 20);
    });

    it('throws BAD_REQUEST when x-trace-id is missing', async () => {
      const mockReq = {
        headers: {
          'x-hash-chain': 'a'.repeat(64),
        },
        url: '/getSyncLogs',
        method: 'GET',
      } as any;

      await requestStorage.run(mockReq, async () => {
        await expect(resolvers.getSyncLogs({ limit: 20 })).rejects.toThrow(
          new TRPCError({
            code: 'BAD_REQUEST',
            message:
              'Trace validation failed: Missing or empty x-trace-id header',
          }),
        );
      });

      expect(
        mockAiQueueService.addCorruptedTransactionJob,
      ).toHaveBeenCalledWith(
        'Missing or empty x-trace-id header',
        expect.any(Object),
        undefined,
      );
    });

    it('throws BAD_REQUEST when x-hash-chain is invalid', async () => {
      const mockReq = {
        headers: {
          'x-trace-id': 'trace-123',
          'x-hash-chain': 'short-hash',
        },
        url: '/getSyncLogs',
        method: 'GET',
      } as any;

      await requestStorage.run(mockReq, async () => {
        await expect(resolvers.getSyncLogs({ limit: 20 })).rejects.toThrow(
          new TRPCError({
            code: 'BAD_REQUEST',
            message:
              'Trace validation failed: Missing or invalid cryptographic x-hash-chain header (expected 64-character SHA-256 hex string)',
          }),
        );
      });

      expect(
        mockAiQueueService.addCorruptedTransactionJob,
      ).toHaveBeenCalledWith(
        'Missing or invalid cryptographic x-hash-chain header (expected 64-character SHA-256 hex string)',
        expect.any(Object),
        'trace-123',
      );
    });

    it('logs console error when pushing corrupted transaction to queue fails', async () => {
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      mockAiQueueService.addCorruptedTransactionJob.mockRejectedValueOnce(
        new Error('Queue error'),
      );

      const mockReq = {
        headers: {
          'x-hash-chain': 'a'.repeat(64),
        },
        url: '/getSyncLogs',
        method: 'GET',
      } as any;

      await requestStorage.run(mockReq, async () => {
        await expect(resolvers.getSyncLogs({ limit: 20 })).rejects.toThrow(
          TRPCError,
        );
      });

      // Allow microtask queue to flush the promise rejection handler
      await new Promise((resolve) => process.nextTick(resolve));

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[TrpcRouter] Failed to push corrupted transaction to DLQ queue:',
        expect.any(Error),
      );
      consoleErrorSpy.mockRestore();
    });

    it('verifies all registered resolver paths invoke service methods', async () => {
      const mockReq = {
        headers: {
          'x-trace-id': 'trace-123',
          'x-hash-chain': 'a'.repeat(64),
        },
      } as any;

      await requestStorage.run(mockReq, async () => {
        // seedDatabase
        await resolvers.seedDatabase();
        expect(mockDrizzleService.runDeterministicSeeding).toHaveBeenCalled();

        // quotaOptimizations
        await resolvers.quotaOptimizations();
        expect(mockAiService.getDynamicQuotaOptimizations).toHaveBeenCalled();

        // eodDigest
        await resolvers.eodDigest({ date: '2026-06-06' });
        expect(mockAiService.generateEodDigest).toHaveBeenCalledWith(
          '2026-06-06',
        );

        // eodDigest without date parameter
        await resolvers.eodDigest({});
        expect(mockAiService.generateEodDigest).toHaveBeenCalledWith(
          expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        );

        // analyzeSentiment
        await resolvers.analyzeSentiment({ notes: ['happy'] });
        expect(mockAiService.analyzeSentiment).toHaveBeenCalledWith(['happy']);

        // getMismatchLogs
        await resolvers.getMismatchLogs();
        expect(mockSyncService.getMismatchLogs).toHaveBeenCalled();

        // resolveMismatchLog
        const mismatchInput = {
          logId: 'log-1',
          shopId: 'shop-1',
          notes: 'resolve',
          items: [],
        };
        await resolvers.resolveMismatchLog(mismatchInput);
        expect(mockSyncService.resolveMismatchLog).toHaveBeenCalledWith(
          mismatchInput,
        );

        // getFailedJobs
        await resolvers.getFailedJobs();
        expect(mockAiQueueService.getFailedJobs).toHaveBeenCalled();

        // updateJobData
        await resolvers.updateJobData({ jobId: 'j-1', data: {} });
        expect(mockAiQueueService.updateJobData).toHaveBeenCalledWith(
          'j-1',
          {},
        );

        // retryJob
        await resolvers.retryJob({ jobId: 'j-2' });
        expect(mockAiQueueService.retryJob).toHaveBeenCalledWith('j-2');

        // removeJob
        await resolvers.removeJob({ jobId: 'j-3' });
        expect(mockAiQueueService.removeJob).toHaveBeenCalledWith('j-3');

        // sync.pull
        await resolvers.sync.pull({
          lastPulledAt: 1000,
          deviceId: 'd-1',
          userId: 'u-1',
        });
        expect(mockSyncService.pullChanges).toHaveBeenCalledWith(
          1000,
          'd-1',
          'u-1',
          undefined,
        );

        // sync.pull with targetTable
        await resolvers.sync.pull({
          lastPulledAt: 1000,
          deviceId: 'd-1',
          userId: 'u-1',
          targetTable: 'item_stocks',
        });
        expect(mockSyncService.pullChanges).toHaveBeenCalledWith(
          1000,
          'd-1',
          'u-1',
          'item_stocks',
        );

        // sync.push
        await resolvers.sync.push({
          changes: {},
          deviceId: 'd-1',
          userId: 'u-1',
        });
        expect(mockSyncService.pushChanges).toHaveBeenCalledWith(
          {},
          'd-1',
          'u-1',
        );
      });
    });
  });

  describe('TrpcController', () => {
    it('initializes and configures the controller', () => {
      expect(controller).toBeDefined();
    });

    it('processes handleTRPC request and adjusts request url context', () => {
      const mockReq = {
        url: '/trpc/getSyncLogs',
      } as any;
      const mockRes = {} as any;

      mockMiddlewareHandler.mockImplementationOnce((req, res, next) => {
        expect(req.url).toBe('/getSyncLogs');
        next();
      });

      controller.handleTRPC(mockReq, mockRes);

      expect(mockMiddlewareHandler).toHaveBeenCalled();
      expect(mockReq.url).toBe('/trpc/getSyncLogs'); // URL restored after middleware run
    });

    it('adjusts empty request URL to slash', () => {
      const mockReq = {
        url: '/trpc',
      } as any;
      const mockRes = {} as any;

      mockMiddlewareHandler.mockImplementationOnce((req, res, next) => {
        expect(req.url).toBe('/');
        next();
      });

      controller.handleTRPC(mockReq, mockRes);

      expect(mockMiddlewareHandler).toHaveBeenCalled();
    });
  });
});
