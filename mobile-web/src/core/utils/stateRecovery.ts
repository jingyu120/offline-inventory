import { Platform } from 'react-native';

const RECOVERY_STATE_KEY = 'burma_app_recovery_state';

export interface AppRecoveryState {
  currentScreen?:
    | 'ledger'
    | 'heatmap'
    | 'leadership'
    | 'intake'
    | 'viber-bot'
    | 'driver-manifest';
  selectedShopId?: string | null;
  activeRowIndex?: number | null;
  loggingModalVisible?: boolean;
  activeTabId?: string | null;
}

interface StorageInterface {
  set(key: string, value: string): void;
  getString(key: string): string | undefined;
  delete(key: string): void;
}

let nativeStorage: StorageInterface | null = null;
if (Platform.OS !== 'web') {
  try {
    const globalRequire = (globalThis as Record<string, unknown>)['require'] as
      | ((id: string) => Record<string, unknown>)
      | undefined;
    if (globalRequire) {
      const mmkv = globalRequire('react-native-mmkv');
      if (mmkv && typeof mmkv['createMMKV'] === 'function') {
        nativeStorage = (mmkv['createMMKV'] as () => StorageInterface)();
      }
    }
  } catch (e) {
    console.warn('MMKV import failed for stateRecovery:', e);
  }
}

export const StateRecovery = {
  saveState(state: AppRecoveryState): void {
    const serialized = JSON.stringify(state);
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(RECOVERY_STATE_KEY, serialized);
      }
    } else if (nativeStorage) {
      try {
        nativeStorage.set(RECOVERY_STATE_KEY, serialized);
      } catch (e) {
        console.warn('Failed to save app state recovery in MMKV:', e);
      }
    }
  },

  loadState(): AppRecoveryState | null {
    let serialized: string | null = null;
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        serialized = localStorage.getItem(RECOVERY_STATE_KEY);
      }
    } else if (nativeStorage) {
      try {
        serialized = nativeStorage.getString(RECOVERY_STATE_KEY) || null;
      } catch (e) {
        console.warn('Failed to load app state recovery from MMKV:', e);
      }
    }

    if (!serialized) return null;
    try {
      return JSON.parse(serialized);
    } catch {
      return null;
    }
  },

  clearState(): void {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(RECOVERY_STATE_KEY);
      }
    } else if (nativeStorage) {
      try {
        nativeStorage.delete(RECOVERY_STATE_KEY);
      } catch (e) {
        console.warn('Failed to delete recovery state in MMKV:', e);
      }
    }
  },
};
