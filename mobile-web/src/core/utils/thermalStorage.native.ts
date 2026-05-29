import { createMMKV } from 'react-native-mmkv';

const storage = createMMKV();
const THERMAL_STATE_KEY = 'burma_thermal_state';

export function getSavedThermalState(): string {
  try {
    return storage.getString(THERMAL_STATE_KEY) || 'NOMINAL';
  } catch {
    return 'NOMINAL';
  }
}

export function saveThermalState(state: string): void {
  try {
    storage.set(THERMAL_STATE_KEY, state);
  } catch (e) {
    console.warn('Failed to save thermal state in MMKV:', e);
  }
}
