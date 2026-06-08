import { database } from '../database/database';
import { sqliteSchema } from '@burma-inventory/shared-types';
import { ThermalGuard, ThermalState } from './thermalGuard';

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

let activeThermalState: ThermalState = 'NOMINAL';

// Subscribe to ThermalGuard
ThermalGuard.subscribe((state) => {
  activeThermalState = state;
});

export class TelemetryLogger {
  static async logEvent(eventType: string, message: string, level = 'error') {
    const now = Date.now();
    try {
      const isExceptionOrDropout =
        level === 'error' ||
        eventType === 'thread_panic' ||
        eventType === 'sync_dropout' ||
        eventType === 'sync_failure' ||
        eventType.includes('exception') ||
        eventType.includes('dropout');

      let activeNetworkGen2GEdge: 'YES' | 'NO' | null = null;
      if (isExceptionOrDropout) {
        try {
          const r = require;
          const { getActiveNetworkQuality } = r(
            '../../features/sync/hooks/useNetworkQuality',
          );
          activeNetworkGen2GEdge = getActiveNetworkQuality().isDegraded
            ? 'YES'
            : 'NO';
        } catch {
          activeNetworkGen2GEdge = 'NO';
        }
      }

      await database.insert(sqliteSchema.telemetry_logs).values({
        id: generateUUID(),
        level,
        event_type: eventType,
        message,
        timestamp: now,
        synced_at_server: null,
        thermal_status: isExceptionOrDropout ? activeThermalState : null,
        network_generation_2G_EDGE: activeNetworkGen2GEdge,
        created_at: Math.floor(now / 1000),
        updated_at: Math.floor(now / 1000),
      } as $Any);
      console.log(`[TelemetryLogger] Logged event: ${eventType} - ${message}`);
    } catch (e) {
      console.error(
        '[TelemetryLogger] Failed to write telemetry log to SQLite:',
        e,
      );
    }
  }
}
