/**
 * sync.native.ts — Native platform sync driver.
 *
 * Direct HTTP delta sync that performs incremental pull and push operations.
 */
import { syncData as engineSyncData } from './syncEngine';

export async function syncData(): Promise<void> {
  try {
    await engineSyncData();
  } catch (error) {
    console.error('[Native] Sync failed:', error);
  }
}

export const syncConnector = null;
