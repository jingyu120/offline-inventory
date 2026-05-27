import * as SecureStore from 'expo-secure-store';
import * as Device from 'expo-device';

const LAST_SYNCED_KEY = 'burma_last_synced_at';

export async function getLastSyncedAt(): Promise<number> {
  try {
    const val = await SecureStore.getItemAsync(LAST_SYNCED_KEY);
    return val ? parseInt(val, 10) : 0;
  } catch {
    return 0;
  }
}

export async function saveLastSyncedAt(ts: number): Promise<void> {
  try {
    await SecureStore.setItemAsync(LAST_SYNCED_KEY, ts.toString());
  } catch (e) {
    console.warn('Failed to save last synced timestamp in SecureStore:', e);
  }
}

export async function getDeviceId(): Promise<string> {
  const key = 'burma_device_id';
  let devId: string | null = null;
  try {
    devId = await SecureStore.getItemAsync(key);
    if (!devId) {
      devId =
        (Device.modelName || 'device') +
        '-' +
        Math.random().toString(36).substring(2, 15);
      await SecureStore.setItemAsync(key, devId);
    }
  } catch {
    devId = 'native-device';
  }
  return devId || 'unknown-device';
}

export async function getActiveRepId(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync('active_rep_id');
  } catch {
    return null;
  }
}
