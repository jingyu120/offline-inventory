import * as crypto from 'crypto';

const SEQUENTIAL_ID_TIMESTAMP_WIDTH = 15;
const SEQUENTIAL_ID_RANDOM_BYTES = 8;

export interface AuditEventHashInput {
  event_id?: string;
  trace_id?: string | null;
  entity_type?: string;
  action?: string;
  previous_state?: unknown;
  new_state?: unknown;
  gps_coordinates?: unknown;
  created_at?: number;
}

/**
 * Computes the SHA-256 hash that links an audit event into the tamper-evident
 * hash chain. The serialization shape is part of the chain contract and must
 * stay byte-for-byte stable across client and server.
 */
export function calculateEventHash(
  event: AuditEventHashInput,
  actorId: string,
  prevHash: string,
): string {
  const dataToHash =
    JSON.stringify({
      event_id: event.event_id,
      trace_id: event.trace_id,
      entity_type: event.entity_type,
      action: event.action,
      previous_state:
        typeof event.previous_state === 'string'
          ? event.previous_state
          : JSON.stringify(event.previous_state),
      new_state:
        typeof event.new_state === 'string'
          ? event.new_state
          : JSON.stringify(event.new_state),
      gps_coordinates: event.gps_coordinates,
      created_at: Number(event.created_at),
    }) +
    '|' +
    actorId +
    '|' +
    prevHash;

  return crypto.createHash('sha256').update(dataToHash).digest('hex');
}

export function generateSequentialId(): string {
  const timestamp = Date.now()
    .toString()
    .padStart(SEQUENTIAL_ID_TIMESTAMP_WIDTH, '0');
  const randomSuffix = crypto
    .randomBytes(SEQUENTIAL_ID_RANDOM_BYTES)
    .toString('hex');
  return `${timestamp}-${randomSuffix}`;
}
