import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { ImageUploadQueue } from './ImageUploadQueue';
import { syncData } from './sync';

import { ThermalGuard } from '../../core/utils/thermalGuard';

const BACKGROUND_SYNC_TASK = 'BACKGROUND_SYNC_TASK';

if (Platform.OS !== 'web') {
  TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
    if (ThermalGuard.getThermalState() === 'CRITICAL') {
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
    try {
      // 1. Perform SQLite sync deltas push/pull (lightweight JSON text payloads first)
      await syncData();

      // 2. Process pending image uploads (only if connection is not degraded)
      const NetInfo = (await import('@react-native-community/netinfo')).default;
      const state = await NetInfo.fetch();
      const is2G =
        state.type === 'cellular' && state.details?.cellularGeneration === '2g';
      const isMockDegraded = (global as $Any).__mockNetworkDegraded === true;

      if (!is2G && !isMockDegraded) {
        await ImageUploadQueue.processQueue();
      }

      return BackgroundFetch.BackgroundFetchResult.NewData;
    } catch (error) {
      console.error('[BackgroundFetch] Background sync failed:', error);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  });
}

export async function registerBackgroundSyncAsync() {
  if (Platform.OS === 'web') {
    return;
  }
  try {
    const isRegistered =
      await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
    if (!isRegistered) {
      await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
        minimumInterval: 15 * 60, // 15 minutes
        stopOnTerminate: false,
      });
    }
  } catch (error) {
    console.error(
      '[BackgroundFetch] Failed to register background sync task:',
      error,
    );
  }
}
