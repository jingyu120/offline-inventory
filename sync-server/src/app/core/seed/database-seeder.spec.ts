import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '@burma-inventory/shared-types';
import { DatabaseSeeder } from './database-seeder';

jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    getFailed: jest.fn().mockResolvedValue([]),
    add: jest.fn().mockResolvedValue({}),
    close: jest.fn().mockResolvedValue(undefined),
  })),
}));

type SeederDb = NodePgDatabase<typeof schema.pgSchema>;

const buildMockDb = () => {
  const mockDb = {
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    onConflictDoNothing: jest.fn().mockResolvedValue(undefined),
    execute: jest.fn().mockResolvedValue(undefined),
  };
  return mockDb;
};

describe('DatabaseSeeder', () => {
  it('logs the raw error when a thrown seed failure exposes neither stack nor message', async () => {
    const seeder = new DatabaseSeeder();
    const mockDb = buildMockDb();
    // Throw a bare object (no stack, no message) to exercise the final
    // `err.stack || err.message || error` fallback branch.
    mockDb.insert.mockImplementationOnce(() => {
      throw { code: 'NO_STACK' };
    });
    const errorSpy = jest
      .spyOn(seeder['logger'], 'error')
      .mockImplementation(() => undefined);

    await expect(
      seeder.seedInitial(mockDb as unknown as SeederDb),
    ).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledWith('Failed to seed E2E dataset:', {
      code: 'NO_STACK',
    });
  });

  it('logs the raw error when a delete failure exposes no message in deterministic seeding', async () => {
    const seeder = new DatabaseSeeder();
    const mockDb = buildMockDb();
    // Reject with a non-Error value lacking `.message` to exercise the
    // `e.message || err` fallback branch in the delete loop.
    mockDb.delete.mockImplementationOnce(() => {
      throw 'raw-delete-error';
    });
    const warnSpy = jest
      .spyOn(seeder['logger'], 'warn')
      .mockImplementation(() => undefined);

    await expect(
      seeder.runDeterministicSeeding(mockDb as unknown as SeederDb),
    ).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith(
      'Could not clear table during deterministic seed: raw-delete-error',
    );
    expect(mockDb.insert).toHaveBeenCalled();
  });
});
