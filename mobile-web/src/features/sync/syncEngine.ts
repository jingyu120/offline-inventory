import { SYNC_CONFIG } from '../../config/appConfig';
import { database } from '../../core/database/database';
import { sqliteSchema, RECORD_SCHEMAS } from '@burma-inventory/shared-types';
import axios from 'axios';
import { SYNC_API_URL } from '../../config/appConfig';
import { eq, inArray, isNull, gt, sql } from 'drizzle-orm';
import { TelemetryLogger } from '../../core/utils/telemetry';

import {
  getLastSyncedAt,
  saveLastSyncedAt,
  getDeviceId,
  getActiveRepId,
} from '../../core/storage/platformStorage';

async function applyPullChanges(changes: any): Promise<void> {
  for (const [tableName, changeset] of Object.entries(changes)) {
    const tableSchema = (sqliteSchema as any)[tableName];
    if (!tableSchema) continue;

    const typedChangeset = changeset as {
      created: any[];
      updated: any[];
      deleted: string[];
    };

    // Apply Deletes
    if (typedChangeset.deleted && typedChangeset.deleted.length > 0) {
      for (const id of typedChangeset.deleted) {
        await database.delete(tableSchema).where(eq(tableSchema.id, id));
      }
    }

    const recordSchema = RECORD_SCHEMAS[tableName];

    // Apply Creates
    if (typedChangeset.created && typedChangeset.created.length > 0) {
      for (const record of typedChangeset.created) {
        const validatedRecord = recordSchema
          ? recordSchema.parse(record)
          : record;
        // Delete first to prevent primary key conflicts, then insert
        await database
          .delete(tableSchema)
          .where(eq(tableSchema.id, validatedRecord.id));
        await database.insert(tableSchema).values(validatedRecord);
      }
    }

    // Apply Updates
    if (typedChangeset.updated && typedChangeset.updated.length > 0) {
      for (const record of typedChangeset.updated) {
        const validatedRecord = recordSchema
          ? recordSchema.parse(record)
          : record;
        await database
          .update(tableSchema)
          .set(validatedRecord)
          .where(eq(tableSchema.id, validatedRecord.id));
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

export async function syncData(): Promise<void> {
  console.log('[SyncEngine] Starting sync cycle...');

  const devId = await getDeviceId();
  const userId = await getActiveRepId();

  // 1. Pull Changes
  const lastSyncedAt = await getLastSyncedAt();
  console.log(
    `[SyncEngine] Last synced timestamp: ${lastSyncedAt}, Device: ${devId}, User: ${userId}`,
  );

  let pullResponse;
  try {
    pullResponse = await axios.get(`${SYNC_API_URL}`, {
      params: {
        last_pulled_at: lastSyncedAt,
        device_id: devId,
        user_id: userId || undefined,
      },
    });
  } catch (error: any) {
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
  const unsyncedLogs = await database
    .select()
    .from(sqliteSchema.interaction_logs)
    .where(isNull(sqliteSchema.interaction_logs.synced_at_server));

  let unsyncedItems: any[] = [];
  if (unsyncedLogs.length > 0) {
    const logIds = unsyncedLogs.map((l: any) => l.id);
    const chunk = SYNC_CONFIG.dbChunkSize;
    for (let i = 0; i < logIds.length; i += chunk) {
      const chunkIds = logIds.slice(i, i + chunk);
      const items = await database
        .select()
        .from(sqliteSchema.interaction_items)
        .where(
          inArray(sqliteSchema.interaction_items.interaction_log_id, chunkIds),
        );
      unsyncedItems = unsyncedItems.concat(items);
    }
  }

  const unsyncedCheckins = await database
    .select()
    .from(sqliteSchema.check_in_logs)
    .where(gt(sqliteSchema.check_in_logs.created_at, lastSyncedAt));

  const unsyncedQuotas = await database
    .select()
    .from(sqliteSchema.daily_quotas)
    .where(gt(sqliteSchema.daily_quotas.created_at, lastSyncedAt));

  const unsyncedTelemetry = await database
    .select()
    .from(sqliteSchema.telemetry_logs)
    .where(isNull(sqliteSchema.telemetry_logs.synced_at_server));

  const pushChanges: any = {};
  if (unsyncedLogs.length > 0) {
    pushChanges.interaction_logs = {
      created: unsyncedLogs,
      updated: [],
      deleted: [],
    };
  }
  if (unsyncedItems.length > 0) {
    pushChanges.interaction_items = {
      created: unsyncedItems,
      updated: [],
      deleted: [],
    };
  }
  if (unsyncedCheckins.length > 0) {
    pushChanges.check_in_logs = {
      created: unsyncedCheckins,
      updated: [],
      deleted: [],
    };
  }
  if (unsyncedQuotas.length > 0) {
    pushChanges.daily_quotas = {
      created: unsyncedQuotas,
      updated: [],
      deleted: [],
    };
  }
  if (unsyncedTelemetry.length > 0) {
    pushChanges.telemetry_logs = {
      created: unsyncedTelemetry,
      updated: [],
      deleted: [],
    };
  }

  if (Object.keys(pushChanges).length > 0) {
    console.log('[SyncEngine] Pushing changes to server...');
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
          },
        },
      );
      console.log('[SyncEngine] Push successful.');

      // Mark local logs as synced
      if (unsyncedLogs.length > 0) {
        const logIds = unsyncedLogs.map((l: any) => l.id);
        const chunk = SYNC_CONFIG.dbChunkSize;
        for (let i = 0; i < logIds.length; i += chunk) {
          const chunkIds = logIds.slice(i, i + chunk);
          await database
            .update(sqliteSchema.interaction_logs)
            .set({ synced_at_server: Date.now() })
            .where(inArray(sqliteSchema.interaction_logs.id, chunkIds));
        }
      }

      // Mark local telemetry as synced
      if (unsyncedTelemetry.length > 0) {
        const telemetryIds = unsyncedTelemetry.map((t: any) => t.id);
        const chunk = SYNC_CONFIG.dbChunkSize;
        for (let i = 0; i < telemetryIds.length; i += chunk) {
          const chunkIds = telemetryIds.slice(i, i + chunk);
          await database
            .update(sqliteSchema.telemetry_logs)
            .set({ synced_at_server: Date.now() })
            .where(inArray(sqliteSchema.telemetry_logs.id, chunkIds));
        }
      }
    } catch (error: any) {
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

function generateUUIDv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
