import { synchronize } from '@nozbe/watermelondb/sync';
import { database } from './database';
import axios from 'axios';

const SYNC_API_URL = 'http://localhost:3000/api/sync';

export async function syncData() {
  await synchronize({
    database,
    pullChanges: async ({ lastPulledAt }) => {
      try {
        const response = await axios.get(`${SYNC_API_URL}?last_pulled_at=${lastPulledAt || 0}`);
        const { changes, timestamp } = response.data;
        return { changes, timestamp };
      } catch (error) {
        console.error('Pull changes failed:', error);
        throw error;
      }
    },
    pushChanges: async ({ changes, lastPulledAt }) => {
      try {
        await axios.post(SYNC_API_URL, { changes, lastPulledAt });
      } catch (error) {
        console.error('Push changes failed:', error);
        throw error;
      }
    },
    migrationsEnabledAtVersion: 1,
  });
}
