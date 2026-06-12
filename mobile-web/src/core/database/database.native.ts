import { open } from '@op-engineering/op-sqlite';
import { drizzle } from 'drizzle-orm/op-sqlite';
import { sqliteSchema } from '@burma-inventory/shared-types';

export const opsqliteDb = open({
  name: 'burma_inventory.sqlite',
});

export const database = drizzle(opsqliteDb, {
  schema: sqliteSchema,
});

export type DatabaseType = typeof database;

/**
 * Runs a group of local writes inside a real op-sqlite transaction for true
 * atomicity. Mirrors the web build's `runAtomic` (database.web.ts), which falls
 * back to sequential writes because the sql.js proxy can't hold a transaction
 * across its single shared connection.
 */
export async function runAtomic(
  work: Parameters<typeof database.transaction>[0],
): Promise<void> {
  await database.transaction(work);
}

/**
 * powerSyncDb stub — exposes just enough surface area so that callers in
 * App.tsx that call powerSyncDb.onChange / powerSyncDb.getUploadQueueStats
 * don't crash on mobile.
 */
export const powerSyncDb = {
  getUploadQueueStats: async () => ({ count: 0 }),
  onChange: (
    _handler: { onChange: () => void },
    _opts?: { tables?: string[] },
  ) => {
    return () => {
      /* no-op */
    };
  },
  connect: async (_connector?: $Any) => {
    /* no-op */
  },
  disconnect: async () => {
    /* no-op */
  },
};
