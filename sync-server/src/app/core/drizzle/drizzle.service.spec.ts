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

// Mock drizzle connection
const mockDb = {
  insert: jest.fn().mockReturnThis(),
  values: jest.fn().mockReturnThis(),
  onConflictDoNothing: jest.fn().mockResolvedValue(undefined),
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

  it('initializes pools and connects to postgres', () => {
    const service = new DrizzleService();
    expect(service.db).toBe(mockDb);
    expect(service.readDb).toBe(mockDb);
    expect(Pool).toHaveBeenCalledTimes(2);
  });

  it('runs seed on module init', async () => {
    const service = new DrizzleService();
    await service.onModuleInit();
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it('closes pools on module destroy', async () => {
    const service = new DrizzleService();
    await service.onModuleDestroy();
  });
});
