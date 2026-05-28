import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { ImageUploadQueue } from './ImageUploadQueue';
import { syncData } from './sync';

const BACKGROUND_SYNC_TASK = 'BACKGROUND_SYNC_TASK';

if (Platform.OS !== 'web') {
  TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
    console.log('[BackgroundFetch] Running background sync task...');
    try {
      // 1. Process pending image uploads
      await ImageUploadQueue.processQueue();
      // 2. Perform SQLite sync deltas push/pull
      await syncData();
      console.log('[BackgroundFetch] Background sync completed successfully.');
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
      console.log('[BackgroundFetch] Registering background sync task...');
      await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
        minimumInterval: 15 * 60, // 15 minutes
        stopOnTerminate: false,
      });
      console.log('[BackgroundFetch] Background sync task registered.');
    } else {
      console.log('[BackgroundFetch] Background sync task already registered.');
    }
  } catch (error) {
    console.error(
      '[BackgroundFetch] Failed to register background sync task:',
      error,
    );
  }
}
