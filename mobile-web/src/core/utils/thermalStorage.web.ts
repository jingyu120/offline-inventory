const THERMAL_STATE_KEY = 'burma_thermal_state';

export function getSavedThermalState(): string {
  if (typeof window === 'undefined' || !window.localStorage) {
    return 'NOMINAL';
  }
  return localStorage.getItem(THERMAL_STATE_KEY) || 'NOMINAL';
}

export function saveThermalState(state: string): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  localStorage.setItem(THERMAL_STATE_KEY, state);
}
