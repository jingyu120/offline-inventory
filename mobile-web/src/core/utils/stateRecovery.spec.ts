/**
 * Unit tests for StateRecovery.
 *
 * StateRecovery checks Platform.OS at runtime to pick a storage backend:
 *   - 'web'  → window.localStorage
 *   - native → react-native-mmkv (via dynamic require)
 */

// ─── Globals and Mocks set BEFORE any module imports ──────────────────────────

const platformMock = { OS: 'web' };
jest.mock('react-native', () => ({
  Platform: platformMock,
}));

const mockMmkvInstance = {
  set: jest.fn(),
  getString: jest.fn(),
  delete: jest.fn(),
};

jest.mock('react-native-mmkv', () => ({
  createMMKV: jest.fn(() => mockMmkvInstance),
}));

const mockStore: Record<string, string> = {};
const mockLocalStorage = {
  getItem: jest.fn((key: string): string | null => mockStore[key] ?? null),
  setItem: jest.fn((key: string, val: string): void => {
    mockStore[key] = val;
  }),
  removeItem: jest.fn((key: string): void => {
    delete mockStore[key];
  }),
};

(globalThis as Record<string, unknown>)['window'] = {
  localStorage: mockLocalStorage,
};
(globalThis as Record<string, unknown>)['localStorage'] = mockLocalStorage;
// Inject require into globalThis so the dynamic require lookup succeeds in Jest
(globalThis as Record<string, unknown>)['require'] = require;

// ─── Imports ─────────────────────────────────────────────────────────────────

import { StateRecovery, AppRecoveryState } from './stateRecovery';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('StateRecovery (web platform)', () => {
  beforeEach(() => {
    platformMock.OS = 'web';
    Object.keys(mockStore).forEach((k) => delete mockStore[k]);

    mockLocalStorage.getItem.mockReset();
    mockLocalStorage.setItem.mockReset();
    mockLocalStorage.removeItem.mockReset();

    mockLocalStorage.getItem.mockImplementation(
      (key: string) => mockStore[key] ?? null,
    );
    mockLocalStorage.setItem.mockImplementation((key: string, val: string) => {
      mockStore[key] = val;
    });
    mockLocalStorage.removeItem.mockImplementation((key: string) => {
      delete mockStore[key];
    });
  });

  it('saves state to localStorage with the correct storage key', () => {
    const state: AppRecoveryState = {
      currentScreen: 'intake',
      selectedShopId: '123',
    };
    StateRecovery.saveState(state);

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'burma_app_recovery_state',
      JSON.stringify(state),
    );
  });

  it('loads previously saved state from localStorage', () => {
    const state: AppRecoveryState = {
      currentScreen: 'ledger',
      selectedShopId: 'shop-99',
    };
    StateRecovery.saveState(state);

    expect(StateRecovery.loadState()).toEqual(state);
  });

  it('returns null when no state has been saved', () => {
    expect(StateRecovery.loadState()).toBeNull();
  });

  it('clears saved state from localStorage', () => {
    StateRecovery.saveState({ currentScreen: 'heatmap' });
    StateRecovery.clearState();

    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(
      'burma_app_recovery_state',
    );
    expect(StateRecovery.loadState()).toBeNull();
  });

  it('returns null when stored JSON is malformed', () => {
    mockStore['burma_app_recovery_state'] = '{not valid json}';
    expect(StateRecovery.loadState()).toBeNull();
  });

  it('does not throw when clearing an already empty store', () => {
    expect(() => StateRecovery.clearState()).not.toThrow();
  });
});

describe('StateRecovery (native platform)', () => {
  beforeEach(() => {
    platformMock.OS = 'ios';
    mockMmkvInstance.set.mockReset();
    mockMmkvInstance.getString.mockReset();
    mockMmkvInstance.delete.mockReset();
  });

  it('covers the MMKV storage path successfully', () => {
    jest.isolateModules(() => {
      mockMmkvInstance.getString.mockReturnValueOnce(
        JSON.stringify({ currentScreen: 'viber-bot' }),
      );

      const requireFn = require;
      const { StateRecovery: nativeStateRecovery } =
        requireFn('./stateRecovery');

      // Test loadState
      expect(nativeStateRecovery.loadState()).toEqual({
        currentScreen: 'viber-bot',
      });
      expect(mockMmkvInstance.getString).toHaveBeenCalledWith(
        'burma_app_recovery_state',
      );

      // Test saveState
      nativeStateRecovery.saveState({ currentScreen: 'ledger' });
      expect(mockMmkvInstance.set).toHaveBeenCalledWith(
        'burma_app_recovery_state',
        JSON.stringify({ currentScreen: 'ledger' }),
      );

      // Test clearState
      nativeStateRecovery.clearState();
      expect(mockMmkvInstance.delete).toHaveBeenCalledWith(
        'burma_app_recovery_state',
      );
    });
  });

  it('handles native storage initialization and operation errors gracefully', () => {
    jest.isolateModules(() => {
      mockMmkvInstance.set.mockImplementationOnce(() => {
        throw new Error('set failed');
      });
      mockMmkvInstance.getString.mockImplementationOnce(() => {
        throw new Error('getString failed');
      });
      mockMmkvInstance.delete.mockImplementationOnce(() => {
        throw new Error('delete failed');
      });

      const requireFn = require;
      const { StateRecovery: nativeStateRecovery } =
        requireFn('./stateRecovery');

      const consoleWarnSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);

      expect(() =>
        nativeStateRecovery.saveState({ currentScreen: 'ledger' }),
      ).not.toThrow();
      expect(nativeStateRecovery.loadState()).toBeNull();
      expect(() => nativeStateRecovery.clearState()).not.toThrow();

      consoleWarnSpy.mockRestore();
    });
  });

  it('handles MMKV import throwing an error during initialization', () => {
    const originalRequire = (globalThis as Record<string, unknown>)['require'];
    (globalThis as Record<string, unknown>)['require'] = jest
      .fn()
      .mockImplementation(() => {
        throw new Error('Require failed');
      });

    const consoleWarnSpy = jest
      .spyOn(console, 'warn')
      .mockImplementation((_msg, _err) => undefined);

    jest.isolateModules(() => {
      const requireFn = require;
      const { StateRecovery: nativeStateRecovery } =
        requireFn('./stateRecovery');
      expect(() =>
        nativeStateRecovery.saveState({ currentScreen: 'ledger' }),
      ).not.toThrow();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'MMKV import failed for stateRecovery:',
        expect.any(Error),
      );
    });

    consoleWarnSpy.mockRestore();
    (globalThis as Record<string, unknown>)['require'] = originalRequire;
  });
});
