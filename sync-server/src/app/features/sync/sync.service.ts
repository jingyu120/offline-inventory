import { Injectable, Logger } from '@nestjs/common';
import { DrizzleService } from '../../core/drizzle';
import { AppConfig } from '../../core/config/app-config';
import { AiService } from '../ai/ai.service';
import * as fs from 'fs';
import * as path from 'path';
import * as schema from '@burma-inventory/shared-types';
import { eq, and, gt, lte, isNull, inArray, desc } from 'drizzle-orm';
import { TABLE_REGISTRY, TableSyncConfig } from './sync-registry';
import { OdooImporterService } from './odoo-importer.service';
import { calculateEventHash, generateSequentialId } from './audit/audit-hash';
import { ConflictResolutionService } from './conflict/conflict-resolution.service';
import { AnomalyDetectionService } from './anomaly/anomaly-detection.service';

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const AUDITED_SHOP_TABLES = ['shops', 'contacts'];
const AUDITED_ORDER_TABLES = ['interaction_logs'];

interface UploadUrlTarget {
  table: $Any;
  idColumn: $Any;
  urlColumn: string;
  entityLabel: string;
}

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly aiService: AiService,
    private readonly odooImporter: OdooImporterService,
    private readonly conflictResolution: ConflictResolutionService,
    private readonly anomalyDetection: AnomalyDetectionService,
    private readonly config: AppConfig,
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
    return calculateEventHash(event, actorId, prevHash);
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
        : this.config.auditGenesisHash;
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

  private generateSequentialId(): string {
    return generateSequentialId();
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
          let prevHash = this.config.auditGenesisHash;
          if (i > 0) {
            prevHash = sorted[i - 1].hash || this.config.auditGenesisHash;
          } else {
            const lastDbEvent = await this.getLastAuditEvent();
            if (lastDbEvent) {
              prevHash = lastDbEvent.hash || this.config.auditGenesisHash;
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

            if (this.isAuditedTable(tableName)) {
              const entityType = this.resolveAuditEntityType(tableName);
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

            // ── Auto-Invoice (Sprint 35) ──────────────────────────────────────
            // When an ORDER_PLACED interaction log is pushed, auto-generate an
            // invoice for the shop so AR aging can begin immediately.
            if (tableName === 'interaction_logs') {
              const orderPlacedLogs = changeset.created.filter(
                (r: $Any) => r.commercial_status === 'ORDER_PLACED',
              );
              for (const log of orderPlacedLogs) {
                // Sum all interaction_items for this log to compute invoice amount
                const items = await tx
                  .select()
                  .from(schema.pgSchema.interaction_items)
                  .where(
                    eq(
                      schema.pgSchema.interaction_items.interaction_log_id,
                      log.id,
                    ),
                  );
                const amount = items.reduce(
                  (sum: number, item: $Any) =>
                    sum + (item.unit_price_at_sale || 0) * (item.quantity || 1),
                  0,
                );
                const now = Date.now();
                // Due in 30 days from the local creation timestamp
                const logRec = log as unknown as schema.InteractionLogRecord;
                const dueDate =
                  (logRec.created_at_local || now) +
                  this.config.autoInvoiceDueDays * MILLISECONDS_PER_DAY;
                const invoiceId = `inv-${this.generateSequentialId()}`;
                await tx
                  .insert(schema.pgSchema.invoices)
                  .values({
                    id: invoiceId,
                    shop_id: logRec.shop_id,
                    interaction_log_id: log.id,
                    amount,
                    due_date: dueDate,
                    grace_period_days: this.config.autoInvoiceGracePeriodDays,
                    state: 'PENDING',
                    created_at: now,
                    updated_at: now,
                  })
                  .onConflictDoNothing();
                this.logger.log(
                  `[AutoInvoice] Created invoice ${invoiceId} for log ${log.id} (shop ${logRec.shop_id}), amount=${amount}, due=${new Date(dueDate).toISOString()}`,
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

              if (this.isAuditedTable(tableName)) {
                const entityType = this.resolveAuditEntityType(tableName);
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

            const prev = { ...existing };

            const { mergedRecord, conflictWarnings } =
              await this.conflictResolution.mergeUpdatedRecord(
                tx,
                tableName,
                record.id,
                incomingDrizzle,
                existing,
                clientLastPullTime,
              );

            for (const warning of conflictWarnings) {
              this.logger.warn(warning);
            }

            await tx
              .update(table)
              .set(mergedRecord)
              .where(eq(table.id, record.id));

            if (this.isAuditedTable(tableName)) {
              const entityType = this.resolveAuditEntityType(tableName);
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
            if (this.isAuditedTable(tableName)) {
              const entityType = this.resolveAuditEntityType(tableName);
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

  private isAuditedTable(tableName: string): boolean {
    return (
      AUDITED_SHOP_TABLES.includes(tableName) ||
      AUDITED_ORDER_TABLES.includes(tableName)
    );
  }

  private resolveAuditEntityType(tableName: string): 'SHOP' | 'ORDER' {
    return AUDITED_SHOP_TABLES.includes(tableName) ? 'SHOP' : 'ORDER';
  }

  private async runAnomalyDetection(
    itemChangeset: schema.WatermelonChangeSet<$Any> | undefined,
  ): Promise<void> {
    return this.anomalyDetection.runAnomalyDetection(
      itemChangeset,
      this.logger,
    );
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
    return this.updateUploadUrl(competitorInsightId, filename, {
      table: schema.pgSchema.competitor_insights,
      idColumn: schema.pgSchema.competitor_insights.id,
      urlColumn: 'photo_url',
      entityLabel: 'competitor insight',
    });
  }

  async updateInteractionLogScreenshot(
    interactionLogId: string,
    filename: string,
  ): Promise<string> {
    return this.updateUploadUrl(interactionLogId, filename, {
      table: schema.pgSchema.interaction_logs,
      idColumn: schema.pgSchema.interaction_logs.id,
      urlColumn: 'viber_screenshot_url',
      entityLabel: 'interaction log',
    });
  }

  async updateInteractionLogPodImage(
    interactionLogId: string,
    filename: string,
  ): Promise<string> {
    return this.updateUploadUrl(interactionLogId, filename, {
      table: schema.pgSchema.interaction_logs,
      idColumn: schema.pgSchema.interaction_logs.id,
      urlColumn: 'pod_image_url',
      entityLabel: 'interaction log',
    });
  }

  private async updateUploadUrl(
    recordId: string,
    filename: string,
    target: UploadUrlTarget,
  ): Promise<string> {
    const url = `/api/sync/uploads/${filename}`;
    const existingRows = await this.drizzle.db
      .select()
      .from(target.table)
      .where(eq(target.idColumn, recordId))
      .limit(1);
    const existing = existingRows[0] || null;

    if (existing) {
      await this.drizzle.db
        .update(target.table)
        .set({
          [target.urlColumn]: url,
          updated_at: Date.now(),
        })
        .where(eq(target.idColumn, recordId));
      this.logger.log(
        `[SyncService] Updated ${target.entityLabel} ${recordId} ${target.urlColumn} to ${url}`,
      );
    } else {
      this.logger.log(
        `[SyncService] Upload for ${target.entityLabel} ${recordId} stored, but record does not exist on server yet. URL ${url} will sync via client push.`,
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
