import { database } from '../database/database';
import { sqliteSchema } from '@burma-inventory/shared-types';
import { ThermalGuard, ThermalState } from './thermalGuard';
import { NetworkQualityObserver } from '../../features/sync/hooks/useNetworkQuality';

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

let activeThermalState: ThermalState = 'NOMINAL';
let activeNetworkGen2GEdge: 'YES' | 'NO' = 'NO';

// Subscribe to ThermalGuard
ThermalGuard.subscribe((state) => {
  activeThermalState = state;
});

// Subscribe to NetworkQualityObserver
NetworkQualityObserver.subscribe((quality) => {
  activeNetworkGen2GEdge = quality.isDegraded ? 'YES' : 'NO';
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

      await database.insert(sqliteSchema.telemetry_logs).values({
        id: generateUUID(),
        level,
        event_type: eventType,
        message,
        timestamp: now,
        synced_at_server: null,
        thermal_status: isExceptionOrDropout ? activeThermalState : null,
        network_generation_2G_EDGE: isExceptionOrDropout
          ? activeNetworkGen2GEdge
          : null,
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
