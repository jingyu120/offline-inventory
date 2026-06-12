import { SYNC_CONFIG, INVENTORY_STATUS } from '../../config/appConfig';
import { database } from '../../core/database/database';
import {
  sqliteSchema,
  RECORD_SCHEMAS,
  WatermelonChangeSet,
} from '@burma-inventory/shared-types';
import {
  eq,
  inArray,
  isNull,
  gt,
  sql,
  getTableColumns,
  SQL,
} from 'drizzle-orm';
import { TelemetryLogger } from '../../core/utils/telemetry';
import { trpcClient } from '../../core/trpc/trpcClient';

import {
  getLastSyncedAt,
  saveLastSyncedAt,
  getDeviceId,
  getActiveRepId,
} from '../../core/storage/platformStorage';
import { ImageUploadQueue } from './ImageUploadQueue';
import { pruneSyncedLocalData } from '../../core/database/garbageCollector';

type SqliteSchema = typeof sqliteSchema;
type SQLiteTables = SqliteSchema[keyof SqliteSchema];

function getPrimaryKeyColName(tableSchema: SQLiteTables): string {
  try {
    const columns = getTableColumns(tableSchema) as unknown as Record<
      string,
      unknown
    >;
    for (const key of Object.keys(columns)) {
      if ((columns[key] as unknown as Record<string, unknown>)?.primary) {
        return key;
      }
    }
  } catch (e) {
    console.warn('[SyncEngine] Failed to resolve primary key column name:', e);
  }
  return 'id'; // default fallback
}

async function applyPullChanges(
  changes: Record<string, WatermelonChangeSet<unknown>>,
): Promise<void> {
  for (const [tableName, changeset] of Object.entries(changes)) {
    const tableSchema = (
      sqliteSchema as unknown as Record<string, SQLiteTables>
    )[tableName];
    if (!tableSchema) continue;

    const typedChangeset = changeset;

    const pkColName = getPrimaryKeyColName(tableSchema);
    const pkCol = (tableSchema as unknown as Record<string, unknown>)[
      pkColName
    ] as SQL;

    // Apply Deletes
    if (typedChangeset.deleted && typedChangeset.deleted.length > 0) {
      for (const id of typedChangeset.deleted) {
        if (
          tableName === 'items' ||
          tableName === 'shops' ||
          tableName === 'projects'
        ) {
          if ('deleted_at' in tableSchema) {
            await database
              .update(tableSchema)
              .set({ deleted_at: Date.now() })
              .where(eq(pkCol, id));
          }
        } else {
          await database.delete(tableSchema).where(eq(pkCol, id));
        }
      }
    }

    const recordSchema = RECORD_SCHEMAS[tableName];

    // Apply Creates
    if (typedChangeset.created && typedChangeset.created.length > 0) {
      for (const record of typedChangeset.created) {
        const validatedRecord = recordSchema
          ? (recordSchema.parse(record) as Record<string, unknown>)
          : (record as Record<string, unknown>);
        const recordId = (validatedRecord[pkColName] ||
          validatedRecord['id']) as string;

        const existing = await database
          .select()
          .from(tableSchema)
          .where(eq(pkCol, recordId))
          .limit(1);
        if (existing.length > 0) {
          await database
            .update(tableSchema)
            .set(validatedRecord)
            .where(eq(pkCol, recordId));
        } else {
          await database.insert(tableSchema).values(validatedRecord);
        }
      }
    }

    // Apply Updates
    if (typedChangeset.updated && typedChangeset.updated.length > 0) {
      for (const record of typedChangeset.updated) {
        const validatedRecord = recordSchema
          ? (recordSchema.parse(record) as Record<string, unknown>)
          : (record as Record<string, unknown>);
        const recordId = (validatedRecord[pkColName] ||
          validatedRecord['id']) as string;
        await database
          .update(tableSchema)
          .set(validatedRecord)
          .where(eq(pkCol, recordId));
      }
    }
  }
}

async function runDatabaseCompaction(): Promise<void> {
  try {
    await database.run(sql`VACUUM`);
  } catch (err) {
    console.warn('[SyncEngine] Failed to run database compaction:', err);
  }
}

let activeSyncPromise: Promise<void> | null = null;

async function executeSyncCycle(targetTable?: string): Promise<void> {
  const devId = await getDeviceId();
  const userId = await getActiveRepId();

  if (targetTable) {
    const lastSyncedAt = await getLastSyncedAt();

    try {
      const pullResponse = await trpcClient.sync.pull.query({
        lastPulledAt: lastSyncedAt,
        deviceId: devId,
        userId: userId || undefined,
        targetTable,
      });

      const { changes } = pullResponse;
      await applyPullChanges(changes);
    } catch (error) {
      console.error(
        `[SyncEngine] Targeted pull for ${targetTable} failed:`,
        error,
      );
    }
    return;
  }

  // Network-Aware Queue Prioritization
  try {
    ImageUploadQueue.resume();
  } catch (err) {
    console.warn(
      '[SyncEngine] Failed to check network quality for queue prioritization:',
      err,
    );
  }

  // 1. Pull Changes
  const lastSyncedAt = await getLastSyncedAt();

  let pullResponse;
  try {
    pullResponse = await trpcClient.sync.pull.query({
      lastPulledAt: lastSyncedAt,
      deviceId: devId,
      userId: userId || undefined,
    });
  } catch (error) {
    console.error('[SyncEngine] Pull failed:', error);
    await TelemetryLogger.logEvent(
      'sync_drop',
      `Sync Pull failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    return;
  }

  const { changes, timestamp } = pullResponse;
  await applyPullChanges(changes);

  // 2. Push Changes
  const syncableTables = [
    'regions',
    'townships',
    'wards',
    'shops',
    'contacts',
    'items',
    'interaction_logs',
    'interaction_items',
    'daily_quotas',
    'item_stocks',
    'planned_routes',
    'check_in_logs',
    'prediction_logs',
    'recommended_orders',
    'price_books',
    'price_book_items',
    'exchange_rates',
    'rep_scores',
    'points_logs',
    'brands',
    'stock_locations',
    'stock_balances',
    'projects',
    'telemetry_logs',
    'rep_kpis',
    'currency_exchange_rates',
    'competitor_insights',
    'pending_inventory_updates',
    'audit_events',
    'expected_inbounds',
  ];

  const pushChanges: Record<string, WatermelonChangeSet<unknown>> = {};

  for (const tableName of syncableTables) {
    const tableSchema = (
      sqliteSchema as unknown as Record<string, SQLiteTables>
    )[tableName];
    if (!tableSchema) continue;

    const hasCreatedAt = 'created_at' in tableSchema;
    const hasUpdatedAt = 'updated_at' in tableSchema;
    const hasSyncedAtServer = 'synced_at_server' in tableSchema;

    let createdRecords: unknown[] = [];
    let updatedRecords: unknown[] = [];

    if (hasSyncedAtServer && 'synced_at_server' in tableSchema) {
      const unsynced = await database
        .select()
        .from(tableSchema)
        .where(isNull(tableSchema.synced_at_server));

      if (hasCreatedAt && 'created_at' in tableSchema) {
        for (const record of unsynced) {
          const rec = record as Record<string, unknown>;
          const createdAt = rec['created_at'] as number;
          if (createdAt > lastSyncedAt) {
            createdRecords.push(record);
          } else {
            updatedRecords.push(record);
          }
        }
      } else {
        createdRecords = unsynced;
      }
    } else {
      if (hasCreatedAt && 'created_at' in tableSchema) {
        createdRecords = await database
          .select()
          .from(tableSchema)
          .where(gt(tableSchema.created_at, lastSyncedAt));
      }

      if (hasUpdatedAt && 'updated_at' in tableSchema) {
        if (hasCreatedAt && 'created_at' in tableSchema) {
          const candidates = await database
            .select()
            .from(tableSchema)
            .where(gt(tableSchema.updated_at, lastSyncedAt));
          updatedRecords = candidates.filter((r) => {
            const rec = r as Record<string, unknown>;
            const createdAt = rec['created_at'] as number;
            return createdAt <= lastSyncedAt;
          });
        } else {
          createdRecords = await database
            .select()
            .from(tableSchema)
            .where(gt(tableSchema.updated_at, lastSyncedAt));
        }
      }
    }

    if (createdRecords.length > 0 || updatedRecords.length > 0) {
      let finalCreated = createdRecords;
      let finalUpdated = updatedRecords;

      if (tableName === 'items' || tableName === 'item_stocks') {
        finalCreated = createdRecords.map((r) => ({
          ...(r as Record<string, unknown>),
          inventory_status: INVENTORY_STATUS.PENDING_APPROVAL,
        }));
        finalUpdated = updatedRecords.map((r) => ({
          ...(r as Record<string, unknown>),
          inventory_status: INVENTORY_STATUS.PENDING_APPROVAL,
        }));
      }

      pushChanges[tableName] = {
        created: finalCreated,
        updated: finalUpdated,
        deleted: [],
      };
    }
  }

  if (Object.keys(pushChanges).length > 0) {
    try {
      await trpcClient.sync.push.mutate({
        changes: pushChanges,
        deviceId: devId,
        userId: userId || undefined,
      });

      // Mark local records as synced generically
      for (const [tableName, changeset] of Object.entries(pushChanges)) {
        const tableSchema = (
          sqliteSchema as unknown as Record<string, SQLiteTables>
        )[tableName];
        if (!tableSchema) continue;

        if ('synced_at_server' in tableSchema) {
          const pkColName = getPrimaryKeyColName(tableSchema);
          const columns = getTableColumns(tableSchema) as unknown as Record<
            string,
            SQL
          >;
          const pkCol = columns[pkColName] || columns['id'];
          const recordIds = [
            ...changeset.created.map(
              (r) =>
                (r as Record<string, unknown>)[pkColName] ||
                (r as Record<string, unknown>)['id'],
            ),
            ...changeset.updated.map(
              (r) =>
                (r as Record<string, unknown>)[pkColName] ||
                (r as Record<string, unknown>)['id'],
            ),
          ] as string[];

          if (recordIds.length > 0) {
            const chunk = SYNC_CONFIG.dbChunkSize;
            for (let i = 0; i < recordIds.length; i += chunk) {
              const chunkIds = recordIds.slice(i, i + chunk);
              await database
                .update(tableSchema)
                .set({ synced_at_server: Date.now() })
                .where(inArray(pkCol, chunkIds));
            }
          }
        }
      }
    } catch (error) {
      console.error('[SyncEngine] Push failed:', error);
      await TelemetryLogger.logEvent(
        'sync_drop',
        `Sync Push failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return;
    }
  }

  // Update sync timestamp
  await saveLastSyncedAt(timestamp);

  // 3. Compact database
  await runDatabaseCompaction();

  // 4. Prune synced local data older than 30 days
  try {
    await pruneSyncedLocalData(database);
  } catch (pruneErr) {
    console.warn('[SyncEngine] Failed to prune synced local data:', pruneErr);
  }
}

export async function syncData(targetTable?: string): Promise<void> {
  if (activeSyncPromise) {
    return activeSyncPromise;
  }

  activeSyncPromise = executeSyncCycle(targetTable);

  try {
    await activeSyncPromise;
  } finally {
    activeSyncPromise = null;
  }
}
