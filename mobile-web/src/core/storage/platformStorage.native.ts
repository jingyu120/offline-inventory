import { createMMKV } from 'react-native-mmkv';
import * as Device from 'expo-device';

const storage = createMMKV();

const LAST_SYNCED_KEY = 'burma_last_synced_at';
const DEVICE_ID_KEY = 'burma_device_id';
const ACTIVE_REP_ID_KEY = 'active_rep_id';

export async function getLastSyncedAt(): Promise<number> {
  try {
    const val = storage.getNumber(LAST_SYNCED_KEY);
    return val || 0;
  } catch {
    return 0;
  }
}

export async function saveLastSyncedAt(ts: number): Promise<void> {
  try {
    storage.set(LAST_SYNCED_KEY, ts);
  } catch (e) {
    console.warn('Failed to save last synced timestamp in MMKV:', e);
  }
}

export async function getDeviceId(): Promise<string> {
  let devId = storage.getString(DEVICE_ID_KEY);
  if (!devId) {
    devId =
      (Device.modelName || 'device') +
      '-' +
      Math.random().toString(36).substring(2, 15);
    storage.set(DEVICE_ID_KEY, devId);
  }
  return devId;
}

export async function getActiveRepId(): Promise<string | null> {
  try {
    return storage.getString(ACTIVE_REP_ID_KEY) || null;
  } catch {
    return null;
  }
}

export async function saveActiveRepId(repId: string): Promise<void> {
  try {
    storage.set(ACTIVE_REP_ID_KEY, repId);
  } catch (e) {
    console.warn('Failed to save active rep in MMKV:', e);
  }
}
