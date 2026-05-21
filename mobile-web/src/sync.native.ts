import { powerSyncDb } from './database';
import {
  PowerSyncBackendConnector,
  PowerSyncCredentials,
  AbstractPowerSyncDatabase,
} from '@powersync/react-native';
import axios from 'axios';
import { SYNC_API_URL } from './config';

class BurmaPowerSyncConnector implements PowerSyncBackendConnector {
  async fetchCredentials(): Promise<PowerSyncCredentials | null> {
    try {
      const response = await axios.get(`${SYNC_API_URL}/credentials`);
      return response.data;
    } catch (e) {
      console.warn(
        'Failed to fetch credentials from sync-server, using local dev defaults:',
        e,
      );
      return {
        endpoint: 'http://localhost:8080', // Default local PowerSync service url
        token: 'mock-token',
      };
    }
  }

  async uploadData(db: AbstractPowerSyncDatabase): Promise<void> {
    const batch = await db.getCrudBatch();
    if (!batch) return;

    try {
      await axios.post(`${SYNC_API_URL}/upload`, {
        batch: batch.crud,
      });
      await batch.complete();
    } catch (error) {
      console.error('Failed to upload PowerSync batch:', error);
      throw error;
    }
  }
}

export const syncConnector = new BurmaPowerSyncConnector();

export async function syncData() {
  try {
    await powerSyncDb.connect(syncConnector);
  } catch (error) {
    console.error('Failed to start PowerSync replication:', error);
  }
}
