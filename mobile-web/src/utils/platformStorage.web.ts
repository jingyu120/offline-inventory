const LAST_SYNCED_KEY = 'burma_last_synced_at';

export async function getLastSyncedAt(): Promise<number> {
  if (typeof window === 'undefined' || !window.localStorage) return 0;
  const val = localStorage.getItem(LAST_SYNCED_KEY);
  return val ? parseInt(val, 10) : 0;
}

export async function saveLastSyncedAt(ts: number): Promise<void> {
  if (typeof window === 'undefined' || !window.localStorage) return;
  localStorage.setItem(LAST_SYNCED_KEY, ts.toString());
}

export async function getDeviceId(): Promise<string> {
  if (typeof window === 'undefined' || !window.localStorage)
    return 'unknown-web-device';
  const key = 'burma_device_id';
  let devId = localStorage.getItem(key);
  if (!devId) {
    devId = 'web-' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem(key, devId);
  }
  return devId;
}

export async function getActiveRepId(): Promise<string | null> {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  return localStorage.getItem('active_rep_id');
}
