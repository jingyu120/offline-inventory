import { Injectable, Logger } from '@nestjs/common';
import { DrizzleService } from '../../core/drizzle';
import { AiService } from '../ai/ai.service';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as schema from '@burma-inventory/shared-types';
import { eq, and, gt, lte, isNull, inArray, ne, gte, desc } from 'drizzle-orm';
import { TABLE_REGISTRY, TableSyncConfig } from './sync-registry';
import { OdooImporterService } from './odoo-importer.service';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly aiService: AiService,
    private readonly odooImporter: OdooImporterService,
  ) {}

  async getLastAuditEvent() {
    const lastEvents = await this.drizzle.readDb
      .select()
      .from(schema.pgSchema.audit_events)
      .orderBy(desc(schema.pgSchema.audit_events.created_at))
      .limit(1);
    return lastEvents[0] || null;
  }

  calculateEventHash(event: $Any, actorId: string, prevHash: string): string {
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

  async commitAuditEvent(
    tx: $Any,
    entityType: 'ORDER' | 'SHOP' | 'INVENTORY',
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'OVERRIDE',
    previousState: $Any,
    newState: $Any,
    actorId: string,
    deviceId: string,
    traceId: string | null,
  ) {
    const lastEvents = await tx
      .select({ hash: schema.pgSchema.audit_events.hash })
      .from(schema.pgSchema.audit_events)
      .orderBy(desc(schema.pgSchema.audit_events.created_at))
      .limit(1);

    const prevHash =
      lastEvents.length > 0 && lastEvents[0].hash
        ? lastEvents[0].hash
        : 'genesis';
    const eventId = `evt-srv-${this.generateSequentialId()}`;
    const now = Date.now();

    const eventData = {
      event_id: eventId,
      trace_id: traceId,
      actor_id: actorId,
      device_id: deviceId,
      entity_type: entityType,
      action: action,
      previous_state: previousState ? JSON.stringify(previousState) : null,
      new_state: newState ? JSON.stringify(newState) : null,
      gps_coordinates:
        newState?.gps_coordinates || previousState?.gps_coordinates || null,
      created_at: now,
    };

    const hash = this.calculateEventHash(eventData, actorId, prevHash);

    await tx.insert(schema.pgSchema.audit_events).values({
      ...eventData,
      previous_state: previousState, // PG jsonb
      new_state: newState, // PG jsonb
      hash,
      status: 'VALID',
    });
  }

  private async getFieldsChangedOnServer(
    tx: $Any,
    entityType: 'SHOP' | 'ORDER' | 'INVENTORY',
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

  private generateSequentialId(): string {
    const timestamp = Date.now().toString().padStart(15, '0');
    const randomSuffix = crypto.randomBytes(8).toString('hex');
    return `${timestamp}-${randomSuffix}`;
  }

  // ── Pull ──────────────────────────────────────────────────────────

  async pullChanges(
    lastPulledAt: number,
    deviceId?: string,
    userId?: string,
    targetTable?: string,
  ): Promise<schema.PullChangesResponse> {
    const pullOne = async (
      tableName: string,
      cfg: TableSyncConfig,
    ): Promise<schema.WatermelonChangeSet<unknown>> => {
      const table = (schema.pgSchema as $Any)[cfg.delegate];
      if (!table) {
        throw new Error(`Drizzle table for ${cfg.delegate} is not defined`);
      }

      const hasCreatedAt = 'created_at' in table;
      const hasUpdatedAt = 'updated_at' in table;

      if (!hasCreatedAt && !hasUpdatedAt) {
        const all = await this.drizzle.db.select().from(table);
        return { created: all.map(cfg.toRecord), updated: [], deleted: [] };
      }

      const conditions: $Any[] = [];
      const updatedConditions: $Any[] = [];

      if (hasCreatedAt) {
        conditions.push(gt(table.created_at, lastPulledAt));
      } else if (hasUpdatedAt) {
        conditions.push(gt(table.updated_at, lastPulledAt));
      }

      if (hasUpdatedAt && hasCreatedAt) {
        updatedConditions.push(
          gt(table.updated_at, lastPulledAt),
          lte(table.created_at, lastPulledAt),
        );
      } else if (hasUpdatedAt) {
        updatedConditions.push(gt(table.updated_at, lastPulledAt));
      }

      if (cfg.softDelete && 'deleted_at' in table) {
        updatedConditions.push(isNull(table.deleted_at));
      }

      const [newRecords, updated, softDeleted] = await Promise.all([
        conditions.length > 0
          ? this.drizzle.db
              .select()
              .from(table)
              .where(and(...conditions))
          : Promise.resolve([]),
        hasUpdatedAt && updatedConditions.length > 0
          ? this.drizzle.db
              .select()
              .from(table)
              .where(and(...updatedConditions))
          : Promise.resolve([]),
        cfg.softDelete && 'deleted_at' in table
          ? this.drizzle.db
              .select({ id: table.id })
              .from(table)
              .where(gt(table.deleted_at, lastPulledAt))
          : Promise.resolve([]),
      ]);

      const softDeletedIds = new Set(softDeleted.map((r: $Any) => r.id));
      const created = newRecords.filter((r: $Any) => !softDeletedIds.has(r.id));
      const newlyDeleted = newRecords
        .filter((r: $Any) => softDeletedIds.has(r.id))
        .map((r: $Any) => ({ id: r.id }));
      const deleted = [...softDeleted, ...newlyDeleted];

      return {
        created: created.map(cfg.toRecord),
        updated: updated.map(cfg.toRecord),
        deleted: deleted.map((r: $Any) => r.id),
      };
    };

    let entries = Object.entries(TABLE_REGISTRY);
    if (targetTable) {
      entries = entries.filter(([tableName]) => tableName === targetTable);
    }
    const results = await Promise.all(
      entries.map(([tableName, cfg]) => pullOne(tableName, cfg)),
    );

    const changes: Record<string, schema.WatermelonChangeSet<unknown>> = {};
    let totalPulled = 0;
    entries.forEach(([tableName], i) => {
      changes[tableName] = results[i];
      totalPulled +=
        results[i].created.length +
        results[i].updated.length +
        results[i].deleted.length;
    });

    if (deviceId) {
      await this.drizzle.db
        .insert(schema.pgSchema.sync_audit_logs)
        .values({
          id: this.generateSequentialId(),
          device_id: deviceId,
          user_id: userId || null,
          action: 'PULL',
          records_pulled: totalPulled,
          records_pushed: 0,
          status: 'SUCCESS',
          created_at: Date.now(),
        })
        .catch((err) => {
          this.logger.error(`Failed to write pull audit log: ${err.message}`);
        });
    }

    return { changes: changes as $Any, timestamp: Date.now() };
  }

  // ── Push ──────────────────────────────────────────────────────────

  async pushChanges(
    changes: schema.PushChangesBody['changes'],
    deviceId?: string,
    userId?: string,
    traceId?: string,
  ): Promise<void> {
    const actorId = userId || 'system';
    const finalDeviceId = deviceId || 'system-device';
    const finalTraceId = traceId || null;

    let totalPushed = 0;
    for (const changeset of Object.values(changes || {})) {
      if (!changeset) continue;
      const c = changeset as $Any;
      totalPushed +=
        (c.created?.length || 0) +
        (c.updated?.length || 0) +
        (c.deleted?.length || 0);
    }

    if (changes && (changes as $Any).audit_events) {
      const auditEvents = (changes as $Any).audit_events;
      if (auditEvents.created && auditEvents.created.length > 0) {
        const sorted = [...auditEvents.created].sort(
          (a, b) => a.created_at - b.created_at,
        );
        for (let i = 0; i < sorted.length; i++) {
          const event = sorted[i];
          let prevHash = 'genesis';
          if (i > 0) {
            prevHash = sorted[i - 1].hash || 'genesis';
          } else {
            const lastDbEvent = await this.getLastAuditEvent();
            if (lastDbEvent) {
              prevHash = lastDbEvent.hash || 'genesis';
            }
          }
          const computedHash = this.calculateEventHash(
            event,
            event.actor_id || 'system',
            prevHash,
          );
          if (computedHash !== event.hash) {
            this.logger.error(
              `[Audit Hash Chain Broken] Event ${event.event_id} has hash ${event.hash} but expected ${computedHash}`,
            );
            event.status = 'COMPROMISED';
          }
        }
      }
    }

    const [, error] = await schema.guardAsync(
      this.drizzle.db.transaction(async (tx) => {
        // Retrieve the client's last pull time from the sync audit logs
        const lastPullLog = await tx
          .select()
          .from(schema.pgSchema.sync_audit_logs)
          .where(
            and(
              eq(schema.pgSchema.sync_audit_logs.device_id, finalDeviceId),
              eq(schema.pgSchema.sync_audit_logs.action, 'PULL'),
              eq(schema.pgSchema.sync_audit_logs.status, 'SUCCESS'),
            ),
          )
          .orderBy(desc(schema.pgSchema.sync_audit_logs.created_at))
          .limit(1);

        const clientLastPullTime = lastPullLog[0]
          ? Number(lastPullLog[0].created_at)
          : 0;

        for (const [tableName, cfg] of Object.entries(TABLE_REGISTRY)) {
          const changeset = (changes as Record<string, unknown>)[tableName] as
            | schema.WatermelonChangeSet<{ id: string }>
            | undefined;
          if (!changeset) continue;

          const table = (schema.pgSchema as $Any)[cfg.delegate];
          if (!table) continue;

          // Creates
          if (changeset.created.length > 0) {
            await tx
              .insert(table)
              .values(changeset.created.map(cfg.toDrizzle))
              .onConflictDoNothing();

            if (
              tableName === 'shops' ||
              tableName === 'interaction_logs' ||
              tableName === 'contacts'
            ) {
              const entityType =
                tableName === 'shops' || tableName === 'contacts'
                  ? 'SHOP'
                  : 'ORDER';
              for (const record of changeset.created) {
                await this.commitAuditEvent(
                  tx,
                  entityType,
                  'CREATE',
                  null,
                  record,
                  actorId,
                  finalDeviceId,
                  finalTraceId,
                );
              }
            }
          }

          // Updates
          for (const record of changeset.updated) {
            const incomingDrizzle = cfg.toDrizzle(record);
            const existingRows = await tx
              .select()
              .from(table)
              .where(eq(table.id, record.id));
            const existing = existingRows[0] || null;

            if (!existing) {
              await tx
                .insert(table)
                .values(incomingDrizzle)
                .catch((err: $Any) => {
                  this.logger.warn(
                    `Could not create missing update record ${record.id}: ${err.message}`,
                  );
                });

              if (
                tableName === 'shops' ||
                tableName === 'interaction_logs' ||
                tableName === 'contacts'
              ) {
                const entityType =
                  tableName === 'shops' || tableName === 'contacts'
                    ? 'SHOP'
                    : 'ORDER';
                await this.commitAuditEvent(
                  tx,
                  entityType,
                  'CREATE',
                  null,
                  incomingDrizzle,
                  actorId,
                  finalDeviceId,
                  finalTraceId,
                );
              }
              continue;
            }

            const incomingTime = incomingDrizzle.updated_at || 0;
            const existingTime = existing.updated_at || 0;

            const recordWasUpdatedOnServer = existingTime > clientLastPullTime;

            let mergedRecord: Record<string, $Any> = { ...incomingDrizzle };
            const prev = { ...existing };

            if (recordWasUpdatedOnServer) {
              let entityType: 'SHOP' | 'ORDER' | 'INVENTORY' | null = null;
              if (tableName === 'shops') entityType = 'SHOP';
              else if (tableName === 'contacts') entityType = 'SHOP';
              else if (tableName === 'interaction_logs') entityType = 'ORDER';

              const serverChangedFields = entityType
                ? await this.getFieldsChangedOnServer(
                    tx,
                    entityType,
                    record.id,
                    clientLastPullTime,
                  )
                : new Set<string>();

              mergedRecord = { ...existing };

              for (const [key, incomingVal] of Object.entries(
                incomingDrizzle,
              )) {
                if (
                  ['id', 'created_at', 'updated_at', 'deleted_at'].includes(key)
                ) {
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

                    if (key === 'commercial_status') {
                      this.logger.warn(
                        `[Conflict Resolution] True conflict on critical operational field "${key}" for record ${record.id}. Maintaining server value "${existingVal}" as source of truth. Client incoming value was "${incomingVal}".`,
                      );
                    }
                  } else {
                    mergedRecord[key] = incomingVal;
                  }
                }
              }

              mergedRecord.updated_at = Math.max(
                incomingTime,
                existingTime,
                Date.now(),
              );
            }

            await tx
              .update(table)
              .set(mergedRecord)
              .where(eq(table.id, record.id));

            if (
              tableName === 'shops' ||
              tableName === 'interaction_logs' ||
              tableName === 'contacts'
            ) {
              const entityType =
                tableName === 'shops' || tableName === 'contacts'
                  ? 'SHOP'
                  : 'ORDER';
              await this.commitAuditEvent(
                tx,
                entityType,
                'UPDATE',
                prev,
                mergedRecord,
                actorId,
                finalDeviceId,
                finalTraceId,
              );
            }
          }

          // Deletes
          if (changeset.deleted.length > 0) {
            if (
              tableName === 'shops' ||
              tableName === 'interaction_logs' ||
              tableName === 'contacts'
            ) {
              const entityType =
                tableName === 'shops' || tableName === 'contacts'
                  ? 'SHOP'
                  : 'ORDER';
              for (const id of changeset.deleted) {
                const existingRows = await tx
                  .select()
                  .from(table)
                  .where(eq(table.id, id));
                const existing = existingRows[0] || null;
                await this.commitAuditEvent(
                  tx,
                  entityType,
                  'DELETE',
                  existing,
                  null,
                  actorId,
                  finalDeviceId,
                  finalTraceId,
                );
              }
            }

            if (cfg.softDelete) {
              await tx
                .update(table)
                .set({ deleted_at: Date.now() })
                .where(inArray(table.id, changeset.deleted));
            } else {
              await tx
                .delete(table)
                .where(inArray(table.id, changeset.deleted));
            }
          }

          this.logger.debug(
            `[${tableName}] +${changeset.created.length} ~${changeset.updated.length} -${changeset.deleted.length}`,
          );
        }
      }),
    );

    if (deviceId) {
      await this.drizzle.db
        .insert(schema.pgSchema.sync_audit_logs)
        .values({
          id: this.generateSequentialId(),
          device_id: deviceId,
          user_id: userId || null,
          action: 'PUSH',
          records_pulled: 0,
          records_pushed: totalPushed,
          status: error ? 'FAILED' : 'SUCCESS',
          error_message: error ? (error as Error).message : null,
          created_at: Date.now(),
        })
        .catch((err) => {
          this.logger.error(`Failed to write push audit log: ${err.message}`);
        });
    }

    if (error) {
      this.logger.error(
        `Failed to push sync changes: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }

    await this.runAnomalyDetection(changes.interaction_items).catch((err) => {
      this.logger.error(`Anomaly detection error: ${err.message}`);
    });

    this.triggerAuditForPushedLogs(
      changes.interaction_logs,
      actorId,
      traceId,
    ).catch((err) => {
      this.logger.error(
        `Failed to trigger post-push screenshot audit: ${err.message}`,
      );
    });
  }

  private async runAnomalyDetection(
    itemChangeset: schema.WatermelonChangeSet<$Any> | undefined,
  ) {
    if (!itemChangeset) return;
    const records = [
      ...(itemChangeset.created || []),
      ...(itemChangeset.updated || []),
    ];

    for (const record of records) {
      if (record.fulfillment_status !== 'PENDING_FULFILLMENT') {
        continue;
      }

      // Fetch the parent interaction log to get the shop_id
      const logs = await this.drizzle.db
        .select()
        .from(schema.pgSchema.interaction_logs)
        .where(
          eq(schema.pgSchema.interaction_logs.id, record.interaction_log_id),
        )
        .limit(1);
      const log = logs[0] || null;
      if (!log || !log.shop_id) {
        continue;
      }

      const shopId = log.shop_id;
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

      // Fetch historical interaction items in the last 30 days for this shop
      // excluding current interaction log
      const historicalItems = await this.drizzle.db
        .select({
          quantity: schema.pgSchema.interaction_items.quantity,
          logId: schema.pgSchema.interaction_logs.id,
        })
        .from(schema.pgSchema.interaction_items)
        .innerJoin(
          schema.pgSchema.interaction_logs,
          eq(
            schema.pgSchema.interaction_items.interaction_log_id,
            schema.pgSchema.interaction_logs.id,
          ),
        )
        .where(
          and(
            eq(schema.pgSchema.interaction_logs.shop_id, shopId),
            gte(schema.pgSchema.interaction_items.created_at, thirtyDaysAgo),
            ne(schema.pgSchema.interaction_logs.id, log.id),
          ),
        );

      const logIds = new Set(historicalItems.map((item) => item.logId));
      const totalQuantity = historicalItems.reduce(
        (sum, item) => sum + item.quantity,
        0,
      );
      const orderCount = logIds.size;
      const average = orderCount > 0 ? totalQuantity / orderCount : 0;

      if (orderCount > 0 && record.quantity > 5 * average) {
        this.logger.log(
          `Anomaly detected: Item ${record.id} quantity ${record.quantity} exceeds 30-day moving average of ${average} by > 500% for shop ${shopId}. Flagging as MANUAL_REVIEW_REQUIRED.`,
        );
        await this.drizzle.db
          .update(schema.pgSchema.interaction_items)
          .set({ compliance_status: 'MANUAL_REVIEW_REQUIRED' })
          .where(eq(schema.pgSchema.interaction_items.id, record.id));
      }
    }
  }

  private async triggerAuditForPushedLogs(
    logChangeset: schema.WatermelonChangeSet<$Any> | undefined,
    actorId: string,
    traceId?: string,
  ) {
    if (!logChangeset) return;
    const records = [
      ...(logChangeset.created || []),
      ...(logChangeset.updated || []),
    ];
    for (const record of records) {
      const logId = record.id;
      const logs = await this.drizzle.db
        .select()
        .from(schema.pgSchema.interaction_logs)
        .where(eq(schema.pgSchema.interaction_logs.id, logId))
        .limit(1);
      const log = logs[0] || null;

      if (log && log.viber_screenshot_url && !log.ai_verification_status) {
        const filename = path.basename(log.viber_screenshot_url);
        const filePath = path.join(process.cwd(), 'uploads', filename);
        if (fs.existsSync(filePath)) {
          this.logger.log(
            `Post-push hook matched file ${filename} for log ${logId}. Starting audit...`,
          );
          this.aiService
            .processScreenshot(logId, filePath, traceId, actorId)
            .catch((err) => {
              this.logger.error(
                `Error processing screenshot for pushed log ${logId}: ${err.message}`,
              );
            });
        }
      }
    }
  }

  async updateCompetitorInsightPhoto(
    competitorInsightId: string,
    filename: string,
  ): Promise<string> {
    const url = `/api/sync/uploads/${filename}`;
    const existingRows = await this.drizzle.db
      .select()
      .from(schema.pgSchema.competitor_insights)
      .where(eq(schema.pgSchema.competitor_insights.id, competitorInsightId))
      .limit(1);
    const existing = existingRows[0] || null;

    if (existing) {
      await this.drizzle.db
        .update(schema.pgSchema.competitor_insights)
        .set({
          photo_url: url,
          updated_at: Date.now(),
        })
        .where(eq(schema.pgSchema.competitor_insights.id, competitorInsightId));
      this.logger.log(
        `[SyncService] Updated competitor insight ${competitorInsightId} photo URL to ${url}`,
      );
    } else {
      this.logger.log(
        `[SyncService] Photo uploaded for competitor insight ${competitorInsightId}, but record does not exist on server yet. URL ${url} will sync via client push.`,
      );
    }

    return url;
  }

  async updateInteractionLogScreenshot(
    interactionLogId: string,
    filename: string,
  ): Promise<string> {
    const url = `/api/sync/uploads/${filename}`;
    const existingRows = await this.drizzle.db
      .select()
      .from(schema.pgSchema.interaction_logs)
      .where(eq(schema.pgSchema.interaction_logs.id, interactionLogId))
      .limit(1);
    const existing = existingRows[0] || null;

    if (existing) {
      await this.drizzle.db
        .update(schema.pgSchema.interaction_logs)
        .set({
          viber_screenshot_url: url,
          updated_at: Date.now(),
        })
        .where(eq(schema.pgSchema.interaction_logs.id, interactionLogId));
      this.logger.log(
        `[SyncService] Updated interaction log ${interactionLogId} screenshot URL to ${url}`,
      );
    } else {
      this.logger.log(
        `[SyncService] Screenshot uploaded for ${interactionLogId}, but log does not exist on server yet. URL ${url} will sync via client push.`,
      );
    }

    return url;
  }

  async getSyncLogs(lastSeenId?: string, limit = 20) {
    let query = this.drizzle.readDb
      .select()
      .from(schema.pgSchema.sync_audit_logs);

    if (lastSeenId) {
      query = query.where(
        gt(schema.pgSchema.sync_audit_logs.id, lastSeenId),
      ) as $Any;
    }

    const logs = await query
      .orderBy(schema.pgSchema.sync_audit_logs.id)
      .limit(limit);

    const userIds = [
      ...new Set(logs.map((l) => l.user_id).filter(Boolean)),
    ] as string[];

    let users: $Any[] = [];
    if (userIds.length > 0) {
      users = await this.drizzle.readDb
        .select({
          id: schema.pgSchema.users.id,
          username: schema.pgSchema.users.username,
          role: schema.pgSchema.users.role,
        })
        .from(schema.pgSchema.users)
        .where(inArray(schema.pgSchema.users.id, userIds));
    }

    const userMap = new Map(users.map((u) => [u.id, u]));
    return logs.map((l) => ({
      ...l,
      createdAt: new Date(l.created_at),
      user: l.user_id ? userMap.get(l.user_id) : null,
    }));
  }

  async importOdoo(
    csvText: string,
  ): Promise<{ importedCount: number; warnings: string[] }> {
    return this.odooImporter.importOdoo(csvText);
  }

  async checkIdempotency(key: string): Promise<$Any | null> {
    const records = await this.drizzle.db
      .select()
      .from(schema.pgSchema.idempotency_keys)
      .where(eq(schema.pgSchema.idempotency_keys.key, key))
      .limit(1);

    if (records.length > 0) {
      try {
        return JSON.parse(records[0].response_body);
      } catch {
        return { success: true };
      }
    }
    return null;
  }

  async getMismatchLogs() {
    const logs = await this.drizzle.readDb
      .select()
      .from(schema.pgSchema.interaction_logs)
      .where(
        eq(schema.pgSchema.interaction_logs.ai_verification_status, 'MISMATCH'),
      )
      .orderBy(desc(schema.pgSchema.interaction_logs.created_at));

    const result = [];
    for (const log of logs) {
      const shop = await this.drizzle.readDb
        .select()
        .from(schema.pgSchema.shops)
        .where(eq(schema.pgSchema.shops.id, log.shop_id))
        .limit(1);
      const itemsList = await this.drizzle.readDb
        .select()
        .from(schema.pgSchema.interaction_items)
        .where(
          eq(schema.pgSchema.interaction_items.interaction_log_id, log.id),
        );

      result.push({
        ...log,
        shopName: shop[0]?.name || 'Unknown Shop',
        items: itemsList,
      });
    }
    return result;
  }

  async resolveMismatchLog(input: {
    logId: string;
    shopId: string;
    notes: string;
    items: {
      itemId: string;
      quantity: number;
      unitPrice: number;
      selectedUnit: string;
      stockCondition: string;
    }[];
  }) {
    await this.drizzle.db.transaction(async (tx) => {
      // 1. Update log
      await tx
        .update(schema.pgSchema.interaction_logs)
        .set({
          shop_id: input.shopId,
          notes: input.notes,
          ai_verification_status: 'VERIFIED',
          ai_verification_notes:
            'Manually verified and resolved by administrator.',
          updated_at: Date.now(),
        })
        .where(eq(schema.pgSchema.interaction_logs.id, input.logId));

      // 2. Delete old items
      await tx
        .delete(schema.pgSchema.interaction_items)
        .where(
          eq(schema.pgSchema.interaction_items.interaction_log_id, input.logId),
        );

      // 3. Insert new verified items
      if (input.items.length > 0) {
        const newItems = input.items.map((item, index) => ({
          id: `man_ii_${input.logId}_${index}`,
          interaction_log_id: input.logId,
          item_id: item.itemId,
          quantity: item.quantity,
          unit_price_at_sale: item.unitPrice,
          unit_price: item.unitPrice,
          selected_currency: 'MMK',
          selected_unit: item.selectedUnit || 'PCS',
          stock_condition: item.stockCondition || 'GOOD',
          fulfillment_status: 'PENDING_FULFILLMENT',
          compliance_status: 'APPROVED',
          created_at: Date.now(),
          updated_at: Date.now(),
        }));
        await tx.insert(schema.pgSchema.interaction_items).values(newItems);
      }
    });

    return { success: true };
  }

  async getContactByPhone(phone: string) {
    const contact = await this.drizzle.db
      .select()
      .from(schema.pgSchema.contacts)
      .where(eq(schema.pgSchema.contacts.phone_number, phone))
      .limit(1);
    return contact[0] || null;
  }

  async createViberLog(data: {
    id: string;
    shopId: string;
    notes: string;
    screenshotUrl: string;
  }) {
    await this.drizzle.db.insert(schema.pgSchema.interaction_logs).values({
      id: data.id,
      shop_id: data.shopId,
      rep_id: 'viber_bot',
      type: 'VIBER',
      commercial_status: 'ORDER_PLACED',
      notes: data.notes,
      viber_screenshot_url: data.screenshotUrl,
      ai_verification_status: 'PENDING',
      ai_verification_notes: 'Queued for AI verification',
      created_at_local: Date.now(),
      device_id: 'viber_bot',
      created_at: Date.now(),
      updated_at: Date.now(),
    });
  }

  async saveIdempotency(key: string, response: $Any): Promise<void> {
    try {
      await this.drizzle.db
        .insert(schema.pgSchema.idempotency_keys)
        .values({
          key,
          response_body: JSON.stringify(response),
          created_at: Date.now(),
        })
        .onConflictDoNothing();
    } catch (err) {
      Logger.error(`Failed to save idempotency key ${key}:`, err);
    }
  }
}
