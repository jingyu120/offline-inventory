import { useCallback, useEffect, useState } from 'react';
import { guardAsync, sqliteSchema } from '@burma-inventory/shared-types';
import { desc, eq } from 'drizzle-orm';
import { database } from '../../../core/database/database';

/** Status value the server stamps on audit rows that fail hash-chain checks. */
const AUDIT_STATUS_COMPROMISED = 'COMPROMISED';

/** Read-only projection of a compromised audit event for the oversight panel. */
export interface CompromisedAuditEvent {
  eventId: string;
  entityType: string;
  action: string;
  createdAt: number;
}

export interface UseCompromisedAuditEventsReturn {
  events: CompromisedAuditEvent[];
  loading: boolean;
  error: boolean;
  refresh: () => Promise<void>;
}

/**
 * Owns the local-DB read of audit_events flagged COMPROMISED by the server's
 * hash-chain verification. Keeps all data access out of the component body so
 * the panel stays a declarative shell (Screen → Hook → Presentational).
 */
export const useCompromisedAuditEvents =
  (): UseCompromisedAuditEventsReturn => {
    const [events, setEvents] = useState<CompromisedAuditEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const loadEvents = useCallback(async (): Promise<void> => {
      setLoading(true);
      setError(false);

      const [rows, queryError] = await guardAsync(
        database
          .select({
            eventId: sqliteSchema.audit_events.event_id,
            entityType: sqliteSchema.audit_events.entity_type,
            action: sqliteSchema.audit_events.action,
            createdAt: sqliteSchema.audit_events.created_at,
          })
          .from(sqliteSchema.audit_events)
          .where(eq(sqliteSchema.audit_events.status, AUDIT_STATUS_COMPROMISED))
          .orderBy(desc(sqliteSchema.audit_events.created_at)),
      );

      if (queryError) {
        console.error('Failed to load compromised audit events:', queryError);
        setError(true);
        setEvents([]);
      } else {
        setEvents(rows ?? []);
      }

      setLoading(false);
    }, []);

    useEffect(() => {
      loadEvents();
    }, [loadEvents]);

    return { events, loading, error, refresh: loadEvents };
  };
