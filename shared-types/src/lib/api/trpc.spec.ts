import { appRouter, trpcResolvers } from './trpc';

describe('tRPC Router', () => {
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeEach(() => {
    caller = appRouter.createCaller({});
    // Reset all resolvers to null
    Object.keys(trpcResolvers).forEach((key) => {
      if (key === 'sync') {
        trpcResolvers.sync = { pull: null, push: null };
      } else {
        (trpcResolvers as Record<string, unknown>)[key] = null;
      }
    });
  });

  describe('getSyncLogs', () => {
    it('throws when resolver is not registered', async () => {
      await expect(caller.getSyncLogs({ limit: 5 })).rejects.toThrow(
        'Resolver not registered',
      );
    });

    it('returns logs when resolver is registered', async () => {
      const mockResult = { success: true, logs: [] };
      trpcResolvers.getSyncLogs = jest.fn().mockResolvedValue(mockResult);

      const res = await caller.getSyncLogs({ limit: 5, lastSeenId: '123' });
      expect(res).toEqual(mockResult);
      expect(trpcResolvers.getSyncLogs).toHaveBeenCalledWith({
        limit: 5,
        lastSeenId: '123',
      });
    });
  });

  describe('quotaOptimizations', () => {
    it('throws when resolver is not registered', async () => {
      await expect(caller.quotaOptimizations()).rejects.toThrow(
        'Resolver not registered',
      );
    });

    it('returns optimizations when resolver is registered', async () => {
      const mockResult = [
        {
          region: 'Yangon',
          currentQuota: 5,
          suggestedQuota: 8,
          reason: 'test',
        },
      ];
      trpcResolvers.quotaOptimizations = jest
        .fn()
        .mockResolvedValue(mockResult);

      const res = await caller.quotaOptimizations();
      expect(res).toEqual(mockResult);
      expect(trpcResolvers.quotaOptimizations).toHaveBeenCalled();
    });
  });

  describe('eodDigest', () => {
    it('throws when resolver is not registered', async () => {
      await expect(caller.eodDigest({ date: '2026-06-04' })).rejects.toThrow(
        'Resolver not registered',
      );
    });

    it('mutates and returns digest when resolver is registered', async () => {
      const mockResult = {
        date: '2026-06-04',
        compiledAt: new Date(),
        topPerformingRep: 'rep-1',
        complianceScorecard: [],
        warnings: [],
        marketSynthesis: {},
      };
      trpcResolvers.eodDigest = jest.fn().mockResolvedValue(mockResult);

      const res = await caller.eodDigest({ date: '2026-06-04' });
      expect(res).toEqual(mockResult);
      expect(trpcResolvers.eodDigest).toHaveBeenCalledWith({
        date: '2026-06-04',
      });
    });
  });

  describe('analyzeSentiment', () => {
    it('throws when resolver is not registered', async () => {
      await expect(
        caller.analyzeSentiment({ notes: ['good'] }),
      ).rejects.toThrow('Resolver not registered');
    });

    it('returns sentiment trend when resolver is registered', async () => {
      const mockResult = {
        sentimentTrend: 'STABLE' as const,
        explanation: 'OK',
      };
      trpcResolvers.analyzeSentiment = jest.fn().mockResolvedValue(mockResult);

      const res = await caller.analyzeSentiment({ notes: ['good'] });
      expect(res).toEqual(mockResult);
      expect(trpcResolvers.analyzeSentiment).toHaveBeenCalledWith({
        notes: ['good'],
      });
    });
  });

  describe('getMismatchLogs', () => {
    it('throws when resolver is not registered', async () => {
      await expect(caller.getMismatchLogs()).rejects.toThrow(
        'Resolver not registered',
      );
    });

    it('returns logs when resolver is registered', async () => {
      const mockResult = [{ id: '1' }];
      trpcResolvers.getMismatchLogs = jest.fn().mockResolvedValue(mockResult);

      const res = await caller.getMismatchLogs();
      expect(res).toEqual(mockResult);
      expect(trpcResolvers.getMismatchLogs).toHaveBeenCalled();
    });
  });

  describe('resolveMismatchLog', () => {
    it('throws when resolver is not registered', async () => {
      await expect(
        caller.resolveMismatchLog({
          logId: '1',
          shopId: '2',
          notes: 'notes',
          items: [],
        }),
      ).rejects.toThrow('Resolver not registered');
    });

    it('returns success when resolver is registered', async () => {
      const mockResult = { success: true };
      trpcResolvers.resolveMismatchLog = jest
        .fn()
        .mockResolvedValue(mockResult);

      const input = {
        logId: '1',
        shopId: '2',
        notes: 'notes',
        items: [{ itemId: '3', quantity: 10, unitPrice: 100 }],
      };
      const res = await caller.resolveMismatchLog(input);
      expect(res).toEqual(mockResult);
      expect(trpcResolvers.resolveMismatchLog).toHaveBeenCalledWith({
        ...input,
        items: [
          {
            itemId: '3',
            quantity: 10,
            unitPrice: 100,
            selectedUnit: 'PCS',
            stockCondition: 'GOOD',
          },
        ],
      });
    });
  });

  describe('getFailedJobs', () => {
    it('throws when resolver is not registered', async () => {
      await expect(caller.getFailedJobs()).rejects.toThrow(
        'Resolver not registered',
      );
    });

    it('returns failed jobs when resolver is registered', async () => {
      const mockResult = [{ name: 'test', timestamp: 1234, data: {} }];
      trpcResolvers.getFailedJobs = jest.fn().mockResolvedValue(mockResult);

      const res = await caller.getFailedJobs();
      expect(res).toEqual(mockResult);
      expect(trpcResolvers.getFailedJobs).toHaveBeenCalled();
    });
  });

  describe('updateJobData', () => {
    it('throws when resolver is not registered', async () => {
      await expect(
        caller.updateJobData({ jobId: '1', data: {} }),
      ).rejects.toThrow('Resolver not registered');
    });

    it('returns success when resolver is registered', async () => {
      const mockResult = { success: true };
      trpcResolvers.updateJobData = jest.fn().mockResolvedValue(mockResult);

      const res = await caller.updateJobData({ jobId: '1', data: {} });
      expect(res).toEqual(mockResult);
      expect(trpcResolvers.updateJobData).toHaveBeenCalledWith({
        jobId: '1',
        data: {},
      });
    });
  });

  describe('retryJob', () => {
    it('throws when resolver is not registered', async () => {
      await expect(caller.retryJob({ jobId: '1' })).rejects.toThrow(
        'Resolver not registered',
      );
    });

    it('returns success when resolver is registered', async () => {
      const mockResult = { success: true };
      trpcResolvers.retryJob = jest.fn().mockResolvedValue(mockResult);

      const res = await caller.retryJob({ jobId: '1' });
      expect(res).toEqual(mockResult);
      expect(trpcResolvers.retryJob).toHaveBeenCalledWith({ jobId: '1' });
    });
  });

  describe('removeJob', () => {
    it('throws when resolver is not registered', async () => {
      await expect(caller.removeJob({ jobId: '1' })).rejects.toThrow(
        'Resolver not registered',
      );
    });

    it('returns success when resolver is registered', async () => {
      const mockResult = { success: true };
      trpcResolvers.removeJob = jest.fn().mockResolvedValue(mockResult);

      const res = await caller.removeJob({ jobId: '1' });
      expect(res).toEqual(mockResult);
      expect(trpcResolvers.removeJob).toHaveBeenCalledWith({ jobId: '1' });
    });
  });

  describe('sync.pull', () => {
    it('throws when resolver is not registered', async () => {
      await expect(caller.sync.pull({ lastPulledAt: 12345 })).rejects.toThrow(
        'Resolver not registered',
      );
    });

    it('returns changes when resolver is registered', async () => {
      const mockResult = {
        changes: {},
        timestamp: 12345,
      };
      trpcResolvers.sync.pull = jest.fn().mockResolvedValue(mockResult);

      const res = await caller.sync.pull({
        lastPulledAt: 12345,
        deviceId: 'device-1',
        userId: 'user-1',
      });
      expect(res).toEqual(mockResult);
      expect(trpcResolvers.sync.pull).toHaveBeenCalledWith({
        lastPulledAt: 12345,
        deviceId: 'device-1',
        userId: 'user-1',
      });
    });
  });

  describe('sync.push', () => {
    it('throws when resolver is not registered', async () => {
      await expect(
        caller.sync.push({
          changes: {},
        }),
      ).rejects.toThrow('Resolver not registered');
    });

    it('returns success when resolver is registered', async () => {
      const mockResult = { success: true };
      trpcResolvers.sync.push = jest.fn().mockResolvedValue(mockResult);

      const input = {
        changes: {
          shops: {
            created: [{ id: 'shop-1', name: 'Shop 1' }],
            updated: [],
            deleted: [],
          },
        },
        deviceId: 'device-1',
        userId: 'user-1',
      };
      const res = await caller.sync.push(input);
      expect(res).toEqual(mockResult);
      expect(trpcResolvers.sync.push).toHaveBeenCalledWith(input);
    });
  });

  describe('seedDatabase', () => {
    it('throws when resolver is not registered', async () => {
      await expect(caller.seedDatabase()).rejects.toThrow(
        'Resolver not registered',
      );
    });

    it('returns success when resolver is registered', async () => {
      const mockResult = { success: true };
      trpcResolvers.seedDatabase = jest.fn().mockResolvedValue(mockResult);

      const res = await caller.seedDatabase();
      expect(res).toEqual(mockResult);
      expect(trpcResolvers.seedDatabase).toHaveBeenCalled();
    });
  });
});
