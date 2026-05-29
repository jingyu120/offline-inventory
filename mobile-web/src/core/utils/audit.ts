import { sqliteSchema } from '@burma-inventory/shared-types';
import { desc } from 'drizzle-orm';
import { sha256 } from './crypto';

export interface AuditEventPayload {
  event_id: string;
  trace_id: string | null;
  actor_id: string;
  device_id: string;
  entity_type: string;
  action: string;
  previous_state: string | null; // stored as JSON string
  new_state: string | null; // stored as JSON string
  gps_coordinates: string | null;
  created_at: number;
  shop_id?: string | null;
  executed_by_id?: string | null;
  salesperson_id?: string | null;
  approved_by_id?: string | null;
}

export async function writeAuditEvent(
  tx: any, // drizzle transaction context
  event: AuditEventPayload,
): Promise<string> {
  // Query previous event's hash
  const previousEvents = await tx
    .select({ hash: sqliteSchema.audit_events.hash })
    .from(sqliteSchema.audit_events)
    .orderBy(desc(sqliteSchema.audit_events.created_at))
    .limit(1);

  const prevHash =
    previousEvents.length > 0 && previousEvents[0].hash
      ? previousEvents[0].hash
      : 'genesis';

  // Construct payload to hash deterministically
  const dataToHash =
    JSON.stringify({
      event_id: event.event_id,
      trace_id: event.trace_id,
      entity_type: event.entity_type,
      action: event.action,
      previous_state: event.previous_state,
      new_state: event.new_state,
      gps_coordinates: event.gps_coordinates,
      created_at: event.created_at,
    }) +
    '|' +
    event.actor_id +
    '|' +
    prevHash;

  const currentHash = sha256(dataToHash);

  await tx.insert(sqliteSchema.audit_events).values({
    ...event,
    hash: currentHash,
    status: 'VALID',
  });

  return currentHash;
}
