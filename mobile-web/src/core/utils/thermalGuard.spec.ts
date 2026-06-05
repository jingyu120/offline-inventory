/**
 * Unit tests for ThermalGuard.
 *
 * thermalGuard.ts imports './thermalStorage' which resolves to thermalStorage.native.ts
 * (MMKV). We mock that module to avoid native bridge requirements in the test env.
 */

// Mock thermalStorage so MMKV is never initialised
jest.mock('./thermalStorage', () => ({
  getSavedThermalState: jest.fn().mockReturnValue('NOMINAL'),
  saveThermalState: jest.fn(),
}));

import { ThermalGuard, ThermalState } from './thermalGuard';
import { saveThermalState } from './thermalStorage';

const mockSaveThermalState = saveThermalState as jest.Mock;

describe('ThermalGuard', () => {
  beforeEach(() => {
    (ThermalGuard as any).setThermalState('NOMINAL');
    jest.clearAllMocks();
  });

  it('returns NOMINAL as the initial thermal state', () => {
    expect(ThermalGuard.getThermalState()).toBe('NOMINAL');
  });

  it('updates the thermal state and persists it via thermalStorage', () => {
    ThermalGuard.setThermalState('SERIOUS');

    expect(ThermalGuard.getThermalState()).toBe('SERIOUS');
    expect(mockSaveThermalState).toHaveBeenCalledWith('SERIOUS');
  });

  it('does not notify subscribers or persist when setting the same state', () => {
    const subscriber = jest.fn();
    const unsubscribe = ThermalGuard.subscribe(subscriber);
    subscriber.mockClear(); // clear the initial call

    ThermalGuard.setThermalState('NOMINAL'); // same as current
    expect(subscriber).not.toHaveBeenCalled();
    expect(mockSaveThermalState).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('notifies subscribers immediately upon subscription with current state', () => {
    const subscriber = jest.fn();
    const unsubscribe = ThermalGuard.subscribe(subscriber);

    expect(subscriber).toHaveBeenCalledTimes(1);
    expect(subscriber).toHaveBeenCalledWith('NOMINAL');
    unsubscribe();
  });

  it('notifies all subscribers when state changes', () => {
    const sub1 = jest.fn();
    const sub2 = jest.fn();
    const unsub1 = ThermalGuard.subscribe(sub1);
    const unsub2 = ThermalGuard.subscribe(sub2);
    sub1.mockClear();
    sub2.mockClear();

    ThermalGuard.setThermalState('CRITICAL');

    expect(sub1).toHaveBeenCalledWith('CRITICAL');
    expect(sub2).toHaveBeenCalledWith('CRITICAL');
    unsub1();
    unsub2();
  });

  it('stops notifying a subscriber after it unsubscribes', () => {
    const subscriber = jest.fn();
    const unsubscribe = ThermalGuard.subscribe(subscriber);
    subscriber.mockClear();

    unsubscribe();
    ThermalGuard.setThermalState('FAIR');

    expect(subscriber).not.toHaveBeenCalled();
  });

  it('transitions through all valid states', () => {
    const states: ThermalState[] = ['FAIR', 'SERIOUS', 'CRITICAL', 'NOMINAL'];
    for (const state of states) {
      ThermalGuard.setThermalState(state);
      expect(ThermalGuard.getThermalState()).toBe(state);
    }
  });
});
