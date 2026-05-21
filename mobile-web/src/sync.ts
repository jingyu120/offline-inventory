import { synchronize } from '@nozbe/watermelondb/sync';
import { database } from './database';
import axios from 'axios';

import { SYNC_API_URL } from './config';
import { SyncConflictManager } from './utils/SyncConflictManager';

const SYNC_TIMEOUT_MS = 30_000; // 30s timeout for low-signal zones

export async function syncData() {
  await synchronize({
    database,
    pullChanges: async ({ lastPulledAt }) => {
      const response = await axios.get(SYNC_API_URL, {
        params: { last_pulled_at: lastPulledAt || 0 },
        timeout: SYNC_TIMEOUT_MS,
      });
      return {
        changes: response.data.changes,
        timestamp: response.data.timestamp,
      };
    },
    pushChanges: async ({ changes, lastPulledAt }) => {
      await axios.post(
        SYNC_API_URL,
        { changes, lastPulledAt },
        {
          timeout: SYNC_TIMEOUT_MS,
        },
      );
    },
    conflictResolver: async (table, local, remote, _resolved) => {
      return SyncConflictManager.registerConflict(table, local._raw, remote);
    },
  });
}
