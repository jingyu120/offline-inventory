import { database } from '../database/database';
import { sqliteSchema } from '@burma-inventory/shared-types';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export class TelemetryLogger {
  static async logEvent(eventType: string, message: string, level = 'error') {
    const now = Date.now();
    try {
      await database.insert(sqliteSchema.telemetry_logs).values({
        id: generateUUID(),
        level,
        event_type: eventType,
        message,
        timestamp: now,
        synced_at_server: null,
        created_at: Math.floor(now / 1000),
        updated_at: Math.floor(now / 1000),
      });
      console.log(`[TelemetryLogger] Logged event: ${eventType} - ${message}`);
    } catch (e) {
      console.error(
        '[TelemetryLogger] Failed to write telemetry log to SQLite:',
        e,
      );
    }
  }
}
