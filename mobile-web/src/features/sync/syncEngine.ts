import { SYNC_CONFIG, INVENTORY_STATUS } from '../../config/appConfig';
import { database } from '../../core/database/database';
import { sqliteSchema, RECORD_SCHEMAS } from '@burma-inventory/shared-types';
import axios from 'axios';
import { SYNC_API_URL } from '../../config/appConfig';
import { eq, inArray, isNull, gt, sql, getTableColumns } from 'drizzle-orm';
import { TelemetryLogger } from '../../core/utils/telemetry';

import {
  getLastSyncedAt,
  saveLastSyncedAt,
  getDeviceId,
  getActiveRepId,
} from '../../core/storage/platformStorage';
import { ActorService } from '../../core/auth/ActorService';
import { ImageUploadQueue } from './ImageUploadQueue';
import { isNetworkDegraded } from './networkQualityUtil';

function getPrimaryKeyColName(tableSchema: $Any): string {
  try {
    const columns = getTableColumns(tableSchema) as $Any;
    for (const key of Object.keys(columns)) {
      if (columns[key]?.primary) {
        return key;
      }
    }
  } catch (e) {
    console.warn('[SyncEngine] Failed to resolve primary key column name:', e);
  }
  return 'id'; // default fallback
}

async function applyPullChanges(changes: $Any): Promise<void> {
  for (const [tableName, changeset] of Object.entries(changes)) {
    const tableSchema = (sqliteSchema as $Any)[tableName];
    if (!tableSchema) continue;

    const typedChangeset = changeset as {
      created: $Any[];
      updated: $Any[];
      deleted: string[];
    };

    const pkColName = getPrimaryKeyColName(tableSchema);
    const pkCol = tableSchema[pkColName] || tableSchema.id;

    // Apply Deletes
    if (typedChangeset.deleted && typedChangeset.deleted.length > 0) {
      for (const id of typedChangeset.deleted) {
        if (
          tableName === 'items' ||
          tableName === 'shops' ||
          tableName === 'projects'
        ) {
          await database
            .update(tableSchema)
            .set({ deleted_at: Date.now() })
            .where(eq(pkCol, id));
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
          ? recordSchema.parse(record)
          : record;
        const recordId = validatedRecord[pkColName] || validatedRecord.id;

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
          ? recordSchema.parse(record)
          : record;
        const recordId = validatedRecord[pkColName] || validatedRecord.id;
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
    console.log('[SyncEngine] Database compaction (VACUUM) completed.');
  } catch (err) {
    console.warn('[SyncEngine] Failed to run database compaction:', err);
  }
}

let activeSyncPromise: Promise<void> | null = null;

async function executeSyncCycle(): Promise<void> {
  console.log('[SyncEngine] Starting sync cycle...');

  const devId = await getDeviceId();
  const userId = await getActiveRepId();

  // Network-Aware Queue Prioritization
  try {
    const degraded = await isNetworkDegraded();
    if (degraded) {
      console.log(
        '[SyncEngine] Highly degraded network (2G/EDGE or mock packet loss). Pausing ImageUploadQueue.',
      );
      ImageUploadQueue.pause();
    } else {
      ImageUploadQueue.resume();
    }
  } catch (err) {
    console.warn(
      '[SyncEngine] Failed to check network quality for queue prioritization:',
      err,
    );
  }

  // 1. Pull Changes
  const lastSyncedAt = await getLastSyncedAt();
  console.log(
    `[SyncEngine] Last synced timestamp: ${lastSyncedAt}, Device: ${devId}, User: ${userId}`,
  );

  let pullResponse;
  try {
    pullResponse = await axios.get(`${SYNC_API_URL}`, {
      params: {
        last_synced_at: lastSyncedAt,
        device_id: devId,
        user_id: userId || undefined,
      },
      headers: {
        'x-actor-id': ActorService.getActorId(),
        'x-device-id': devId,
      },
    });
  } catch (error: $Any) {
    console.error('[SyncEngine] Pull failed:', error);
    await TelemetryLogger.logEvent(
      'sync_drop',
      `Sync Pull failed: ${error?.message || String(error)}`,
    );
    return;
  }

  const { changes, timestamp } = pullResponse.data;
  await applyPullChanges(changes);
  console.log('[SyncEngine] Pull applied successfully.');

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

  const pushChanges: $Any = {};

  for (const tableName of syncableTables) {
    const tableSchema = (sqliteSchema as $Any)[tableName];
    if (!tableSchema) continue;

    const hasCreatedAt = 'created_at' in tableSchema;
    const hasUpdatedAt = 'updated_at' in tableSchema;
    const hasSyncedAtServer = 'synced_at_server' in tableSchema;

    let createdRecords: $Any[] = [];
    let updatedRecords: $Any[] = [];

    if (hasSyncedAtServer) {
      const unsynced = await database
        .select()
        .from(tableSchema)
        .where(isNull(tableSchema.synced_at_server));

      if (hasCreatedAt) {
        for (const record of unsynced) {
          if (record.created_at > lastSyncedAt) {
            createdRecords.push(record);
          } else {
            updatedRecords.push(record);
          }
        }
      } else {
        createdRecords = unsynced;
      }
    } else {
      if (hasCreatedAt) {
        createdRecords = await database
          .select()
          .from(tableSchema)
          .where(gt(tableSchema.created_at, lastSyncedAt));
      }

      if (hasUpdatedAt) {
        if (hasCreatedAt) {
          const candidates = await database
            .select()
            .from(tableSchema)
            .where(gt(tableSchema.updated_at, lastSyncedAt));
          updatedRecords = candidates.filter(
            (r: $Any) => r.created_at <= lastSyncedAt,
          );
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
          ...r,
          inventory_status: INVENTORY_STATUS.PENDING_APPROVAL,
        }));
        finalUpdated = updatedRecords.map((r) => ({
          ...r,
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
    console.log(
      '[SyncEngine] Pushing changes to server...',
      JSON.stringify(Object.keys(pushChanges)),
    );
    try {
      const idempotencyKey = generateUUIDv4();
      await axios.post(
        `${SYNC_API_URL}`,
        {
          changes: pushChanges,
          device_id: devId,
          user_id: userId || undefined,
        },
        {
          headers: {
            'x-idempotency-key': idempotencyKey,
            'x-actor-id': ActorService.getActorId(),
            'x-device-id': devId,
          },
        },
      );
      console.log('[SyncEngine] Push successful.');

      // Mark local records as synced generically
      for (const [tableName, changeset] of Object.entries(pushChanges)) {
        const tableSchema = (sqliteSchema as $Any)[tableName];
        if (!tableSchema) continue;

        if ('synced_at_server' in tableSchema) {
          const pkColName = getPrimaryKeyColName(tableSchema);
          const pkCol = tableSchema[pkColName] || tableSchema.id;
          const recordIds = [
            ...(changeset as $Any).created.map(
              (r: $Any) => r[pkColName] || r.id,
            ),
            ...(changeset as $Any).updated.map(
              (r: $Any) => r[pkColName] || r.id,
            ),
          ];

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
    } catch (error: $Any) {
      console.error('[SyncEngine] Push failed:', error);
      await TelemetryLogger.logEvent(
        'sync_drop',
        `Sync Push failed: ${error?.message || String(error)}`,
      );
      return;
    }
  } else {
    console.log('[SyncEngine] No local changes to push.');
  }

  // Update sync timestamp
  await saveLastSyncedAt(timestamp);

  // 3. Compact database
  await runDatabaseCompaction();

  console.log('[SyncEngine] Sync cycle complete.');
}

export async function syncData(): Promise<void> {
  if (activeSyncPromise) {
    console.log(
      '[SyncEngine] Sync is already in progress, attaching to existing cycle.',
    );
    return activeSyncPromise;
  }

  activeSyncPromise = executeSyncCycle();

  try {
    await activeSyncPromise;
  } finally {
    activeSyncPromise = null;
  }
}

function generateUUIDv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
