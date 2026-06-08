import { database, DatabaseType } from './database';
import { sqliteSchema } from '@burma-inventory/shared-types';
import { lte, inArray, and, isNotNull, ne } from 'drizzle-orm';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

export async function runGarbageCollection() {
  console.log('[GarbageCollector] Running SQLite storage pruning lifecycle...');

  // Calculate threshold for 45 days ago in milliseconds
  const threshold = Date.now() - 45 * 24 * 60 * 60 * 1000;

  try {
    // 1. Prune Image Upload Queue files and records
    const filesToPrune = await database
      .select({
        id: sqliteSchema.image_upload_queue.id,
        local_file_path: sqliteSchema.image_upload_queue.local_file_path,
      })
      .from(sqliteSchema.image_upload_queue)
      .where(lte(sqliteSchema.image_upload_queue.created_at, threshold));

    if (filesToPrune.length > 0) {
      console.log(
        `[GarbageCollector] Found ${filesToPrune.length} files to delete from local disk.`,
      );
      for (const item of filesToPrune) {
        if (Platform.OS !== 'web' && item.local_file_path) {
          try {
            const info = await FileSystem.getInfoAsync(item.local_file_path);
            if (info.exists) {
              await FileSystem.deleteAsync(item.local_file_path, {
                idempotent: true,
              });
              console.log(
                `[GarbageCollector] Deleted local file: ${item.local_file_path}`,
              );
            }
          } catch (fileErr) {
            console.warn(
              `[GarbageCollector] Failed to delete file ${item.local_file_path}:`,
              fileErr,
            );
          }
        }
      }

      const ids = filesToPrune.map((f) => f.id);
      await database
        .delete(sqliteSchema.image_upload_queue)
        .where(inArray(sqliteSchema.image_upload_queue.id, ids));
      console.log(`[GarbageCollector] Pruned upload queue records.`);
    }

    // 2. Prune old interaction items first
    const logsToPrune = await database
      .select({ id: sqliteSchema.interaction_logs.id })
      .from(sqliteSchema.interaction_logs)
      .where(lte(sqliteSchema.interaction_logs.created_at, threshold));

    if (logsToPrune.length > 0) {
      const logIds = logsToPrune.map((l) => l.id);

      // Delete child interaction items
      await database
        .delete(sqliteSchema.interaction_items)
        .where(
          inArray(sqliteSchema.interaction_items.interaction_log_id, logIds),
        );

      // Delete parent interaction logs
      await database
        .delete(sqliteSchema.interaction_logs)
        .where(inArray(sqliteSchema.interaction_logs.id, logIds));

      console.log(
        `[GarbageCollector] Pruned ${logIds.length} interaction logs and their items.`,
      );
    }

    // 3. Prune old telemetry logs
    await database
      .delete(sqliteSchema.telemetry_logs)
      .where(lte(sqliteSchema.telemetry_logs.created_at, threshold));
    console.log('[GarbageCollector] Pruned old telemetry logs.');

    console.log(
      '[GarbageCollector] Local storage pruning completed successfully.',
    );
  } catch (err) {
    console.error(
      '[GarbageCollector] Error running database garbage collection:',
      err,
    );
  }
}

export async function pruneSyncedLocalData(db: DatabaseType) {
  console.log('[GarbageCollector] Running pruneSyncedLocalData...');
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;

  try {
    // Find all synced logs older than 30 days
    const candidateLogs = await db
      .select({ id: sqliteSchema.interaction_logs.id })
      .from(sqliteSchema.interaction_logs)
      .where(
        and(
          isNotNull(sqliteSchema.interaction_logs.synced_at_server),
          lte(sqliteSchema.interaction_logs.created_at, cutoff),
        ),
      );

    if (candidateLogs.length === 0) {
      console.log('[GarbageCollector] No old synced logs to prune.');
      return;
    }

    // Find logs that have outstanding/pending image uploads
    const pendingImages = await db
      .select({
        interaction_log_id: sqliteSchema.image_upload_queue.interaction_log_id,
      })
      .from(sqliteSchema.image_upload_queue)
      .where(
        and(
          isNotNull(sqliteSchema.image_upload_queue.interaction_log_id),
          ne(sqliteSchema.image_upload_queue.status, 'completed'),
        ),
      );

    const pendingLogIds = new Set(
      pendingImages
        .map((img) => img.interaction_log_id)
        .filter((id): id is string => id !== null),
    );

    const logIdsToPrune = candidateLogs
      .map((log) => log.id)
      .filter((id) => !pendingLogIds.has(id));

    if (logIdsToPrune.length > 0) {
      console.log(
        `[GarbageCollector] Pruning ${logIdsToPrune.length} synced logs and their items...`,
      );

      // Delete child interaction items first to preserve relation flow
      await db
        .delete(sqliteSchema.interaction_items)
        .where(
          inArray(
            sqliteSchema.interaction_items.interaction_log_id,
            logIdsToPrune,
          ),
        );

      // Delete parent interaction logs
      await db
        .delete(sqliteSchema.interaction_logs)
        .where(inArray(sqliteSchema.interaction_logs.id, logIdsToPrune));

      console.log(
        `[GarbageCollector] Successfully pruned ${logIdsToPrune.length} logs.`,
      );
    } else {
      console.log(
        '[GarbageCollector] All candidate logs are referenced by pending image uploads.',
      );
    }
  } catch (err) {
    console.error('[GarbageCollector] Error pruning synced local data:', err);
  }
}
