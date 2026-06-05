import { getSavedThermalState, saveThermalState } from './thermalStorage';

export type ThermalState = 'NOMINAL' | 'FAIR' | 'SERIOUS' | 'CRITICAL';

let currentThermalState: ThermalState =
  (getSavedThermalState() as ThermalState) || 'NOMINAL';
const listeners = new Set<(state: ThermalState) => void>();

export const ThermalGuard = {
  getThermalState(): ThermalState {
    return currentThermalState;
  },

  setThermalState(state: ThermalState): void {
    if (currentThermalState === state) return;
    currentThermalState = state;
    saveThermalState(state);
    listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (e) {
        console.error('Error in ThermalGuard listener callback:', e);
      }
    });
  },

  subscribe(callback: (state: ThermalState) => void): () => void {
    listeners.add(callback);
    // Call immediately with current state
    callback(currentThermalState);
    return () => {
      listeners.delete(callback);
    };
  },
};

(globalThis as Record<string, unknown>).ThermalGuard = ThermalGuard;
