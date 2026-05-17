import { synchronize } from '@nozbe/watermelondb/sync';
import { database } from './database';
import axios from 'axios';
// Read from environment or use default for local development
const SYNC_API_URL =
  process.env['SYNC_API_URL'] || 'http://localhost:3000/api/sync';
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
    migrationsEnabledAtVersion: 1,
  });
}
//# sourceMappingURL=sync.js.map
