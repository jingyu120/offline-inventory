import { DrizzleService } from './drizzle.service';
import { Pool } from 'pg';

jest.mock('pg', () => {
  return {
    Pool: jest.fn().mockImplementation(() => {
      return {
        connect: jest.fn(),
        query: jest.fn(),
        end: jest.fn().mockResolvedValue(undefined),
      };
    }),
  };
});

jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    getFailed: jest.fn().mockResolvedValue([]),
    add: jest.fn().mockResolvedValue({}),
    close: jest.fn().mockResolvedValue(undefined),
  })),
}));

// Mock drizzle connection
const mockDb = {
  insert: jest.fn().mockReturnThis(),
  values: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  onConflictDoNothing: jest.fn().mockResolvedValue(undefined),
  execute: jest.fn().mockResolvedValue(undefined),
};

jest.mock('drizzle-orm/node-postgres', () => {
  return {
    drizzle: jest.fn().mockImplementation(() => mockDb),
  };
});

describe('DrizzleService', () => {
  let originalEnv: string | undefined;

  beforeAll(() => {
    originalEnv = process.env['DATABASE_URL'];
    process.env['DATABASE_URL'] = 'postgres://user:pass@localhost:5432/test';
  });

  afterAll(() => {
    process.env['DATABASE_URL'] = originalEnv;
  });

  it('throws when DATABASE_URL is not defined', () => {
    const savedUrl = process.env['DATABASE_URL'];
    delete process.env['DATABASE_URL'];
    expect(() => new DrizzleService()).toThrow('DATABASE_URL is not defined');
    process.env['DATABASE_URL'] = savedUrl;
  });

  it('initializes pools and connects to postgres', () => {
    const service = new DrizzleService();
    expect(service.db).toBe(mockDb);
    expect(service.readDb).toBe(mockDb);
    expect(Pool).toHaveBeenCalledTimes(2);
  });

  it('handles non-Error trigger failure gracefully (String path)', async () => {
    // Make execute reject with a non-Error object to exercise the String(triggerErr) branch
    mockDb.execute.mockRejectedValueOnce('raw string error');
    const service = new DrizzleService();
    await expect(service.onModuleInit()).resolves.toBeUndefined();
  });

  it('runs seed on module init', async () => {
    const service = new DrizzleService();
    await service.onModuleInit();
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it('handles database trigger configuration failure gracefully', async () => {
    mockDb.execute.mockRejectedValueOnce(new Error('Execute fail'));
    const service = new DrizzleService();
    await expect(service.onModuleInit()).resolves.toBeUndefined();
  });

  it('handles general seed failure gracefully', async () => {
    mockDb.insert.mockImplementationOnce(() => {
      throw new Error('Insert fail');
    });
    const service = new DrizzleService();
    await expect(service.onModuleInit()).resolves.toBeUndefined();
  });

  it('closes pools on module destroy', async () => {
    const service = new DrizzleService();
    await service.onModuleDestroy();
  });

  it('runs deterministic seeding', async () => {
    const service = new DrizzleService();
    await service.runDeterministicSeeding();
    expect(mockDb.delete).toHaveBeenCalled();
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it('handles delete failure in runDeterministicSeeding gracefully', async () => {
    mockDb.delete.mockImplementationOnce(() => {
      throw new Error('Delete fail');
    });
    const service = new DrizzleService();
    await service.runDeterministicSeeding();
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it('handles BullMQ failure in seed() gracefully (warn path)', async () => {
    // Make Queue constructor throw so the catch block is exercised
    const { Queue } = jest.requireMock('bullmq') as { Queue: jest.Mock };
    Queue.mockImplementationOnce(() => {
      throw new Error('Redis connection refused');
    });
    const service = new DrizzleService();
    // seed() calls Queue internally; failure should not bubble up
    await expect(service.onModuleInit()).resolves.toBeUndefined();
  });

  it('handles BullMQ failure in runDeterministicSeeding() gracefully (warn path)', async () => {
    const { Queue } = jest.requireMock('bullmq') as { Queue: jest.Mock };
    Queue.mockImplementationOnce(() => {
      throw new Error('Redis connection refused');
    });
    const service = new DrizzleService();
    await expect(service.runDeterministicSeeding()).resolves.toBeUndefined();
  });
});
