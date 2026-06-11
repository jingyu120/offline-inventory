import { Injectable } from '@nestjs/common';
import * as schema from '@burma-inventory/shared-types';
import { and, eq, gt } from 'drizzle-orm';

export type ConflictEntityType = 'SHOP' | 'ORDER' | 'INVENTORY';

const IMMUTABLE_MERGE_FIELDS = ['id', 'created_at', 'updated_at', 'deleted_at'];

const CRITICAL_OPERATIONAL_FIELD = 'commercial_status';

export interface MergeUpdatedRecordResult {
  mergedRecord: Record<string, $Any>;
  conflictWarnings: string[];
}

/**
 * Encapsulates the field-level, last-write-wins conflict-resolution policy used
 * during push. Server-side changes to a field always win over a concurrent
 * client change to that same field; otherwise the client value is applied.
 */
@Injectable()
export class ConflictResolutionService {
  async getFieldsChangedOnServer(
    tx: $Any,
    entityType: ConflictEntityType,
    recordId: string,
    sinceTime: number,
  ): Promise<Set<string>> {
    const changedFields = new Set<string>();

    const events = await tx
      .select()
      .from(schema.pgSchema.audit_events)
      .where(
        and(
          eq(schema.pgSchema.audit_events.entity_type, entityType),
          gt(schema.pgSchema.audit_events.created_at, sinceTime),
        ),
      );

    for (const event of events) {
      let ps: Record<string, $Any> | null = null;
      let ns: Record<string, $Any> | null = null;

      try {
        ps =
          typeof event.previous_state === 'string'
            ? JSON.parse(event.previous_state)
            : event.previous_state;
      } catch {
        // ignore parse errors
      }

      try {
        ns =
          typeof event.new_state === 'string'
            ? JSON.parse(event.new_state)
            : event.new_state;
      } catch {
        // ignore parse errors
      }

      if (ps?.id === recordId || ns?.id === recordId) {
        if (!ps) {
          if (ns) {
            for (const key of Object.keys(ns)) {
              changedFields.add(key);
            }
          }
        } else if (ns) {
          for (const key of Object.keys(ns)) {
            if (ns[key] !== ps[key]) {
              changedFields.add(key);
            }
          }
        }
      }
    }

    return changedFields;
  }

  /**
   * Produces the merged record to persist for an update, applying the
   * last-write-wins policy when the row was also changed on the server since
   * the client's last pull. Returns any conflict warnings the caller should
   * surface through its own logger so log output stays attributable to the
   * orchestrating service.
   */
  async mergeUpdatedRecord(
    tx: $Any,
    tableName: string,
    recordId: string,
    incomingDrizzle: Record<string, $Any>,
    existing: Record<string, $Any>,
    clientLastPullTime: number,
  ): Promise<MergeUpdatedRecordResult> {
    const conflictWarnings: string[] = [];
    const incomingTime = incomingDrizzle.updated_at || 0;
    const existingTime = existing.updated_at || 0;
    const recordWasUpdatedOnServer = existingTime > clientLastPullTime;

    let mergedRecord: Record<string, $Any> = { ...incomingDrizzle };

    if (!recordWasUpdatedOnServer) {
      return { mergedRecord, conflictWarnings };
    }

    const entityType = this.resolveConflictEntityType(tableName);

    const serverChangedFields = entityType
      ? await this.getFieldsChangedOnServer(
          tx,
          entityType,
          recordId,
          clientLastPullTime,
        )
      : new Set<string>();

    mergedRecord = { ...existing };

    for (const [key, incomingVal] of Object.entries(incomingDrizzle)) {
      if (IMMUTABLE_MERGE_FIELDS.includes(key)) {
        continue;
      }

      const existingVal = (existing as $Any)[key];

      if (incomingVal === undefined) {
        continue;
      }

      if (incomingVal === existingVal) {
        mergedRecord[key] = existingVal;
      } else {
        const fieldChangedOnServer = serverChangedFields.has(key);

        if (fieldChangedOnServer) {
          mergedRecord[key] = existingVal;

          if (key === CRITICAL_OPERATIONAL_FIELD) {
            conflictWarnings.push(
              `[Conflict Resolution] True conflict on critical operational field "${key}" for record ${recordId}. Maintaining server value "${existingVal}" as source of truth. Client incoming value was "${incomingVal}".`,
            );
          }
        } else {
          mergedRecord[key] = incomingVal;
        }
      }
    }

    mergedRecord.updated_at = Math.max(incomingTime, existingTime, Date.now());

    return { mergedRecord, conflictWarnings };
  }

  private resolveConflictEntityType(
    tableName: string,
  ): ConflictEntityType | null {
    if (tableName === 'shops') return 'SHOP';
    if (tableName === 'contacts') return 'SHOP';
    if (tableName === 'interaction_logs') return 'ORDER';
    return null;
  }
}
