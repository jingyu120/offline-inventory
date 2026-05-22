/**
 * sync.web.ts — Web platform sync driver.
 *
 * Direct HTTP delta sync that performs incremental pull and push operations.
 */
import { syncData as engineSyncData } from './utils/syncEngine';

export async function syncData(): Promise<void> {
  try {
    await engineSyncData();
  } catch (error) {
    console.error('[Web] Sync failed:', error);
  }
}

export const syncConnector = null;
