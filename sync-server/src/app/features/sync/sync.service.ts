import { Injectable, Logger } from '@nestjs/common';
import { DrizzleService } from '../../core/drizzle';
import { guardAsync } from '@burma-inventory/shared-types';
import { AiService } from '../ai/ai.service';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as schema from '@burma-inventory/shared-types';
import { eq, and, gt, lte, isNull, inArray, desc } from 'drizzle-orm';
import type {
  PullChangesResponse,
  PushChangesBody,
  WatermelonChangeSet,
} from '@burma-inventory/shared-types';

interface TableSyncConfig<TRecord = any> {
  delegate: string;
  softDelete: boolean;
  hasTimestamps: boolean;
  toRecord: (row: any) => TRecord;
  toDrizzle: (record: TRecord) => any;
}

const TABLE_REGISTRY: Record<string, TableSyncConfig> = {
  regions: {
    delegate: 'regions',
    softDelete: true,
    hasTimestamps: true,
    toRecord: (r) => r,
    toDrizzle: (r) => r,
  },
  shops: {
    delegate: 'shops',
    softDelete: true,
    hasTimestamps: true,
    toRecord: (s) => s,
    toDrizzle: (s) => s,
  },
  contacts: {
    delegate: 'contacts',
    softDelete: true,
    hasTimestamps: true,
    toRecord: (c) => c,
    toDrizzle: (c) => c,
  },
  items: {
    delegate: 'items',
    softDelete: true,
    hasTimestamps: true,
    toRecord: (i) => i,
    toDrizzle: (i) => i,
  },
  interaction_logs: {
    delegate: 'interaction_logs',
    softDelete: true,
    hasTimestamps: true,
    toRecord: (l) => l,
    toDrizzle: (l) => ({
      ...l,
      synced_at_server: Date.now(),
    }),
  },
  interaction_items: {
    delegate: 'interaction_items',
    softDelete: true,
    hasTimestamps: true,
    toRecord: (i) => i,
    toDrizzle: (i) => ({
      ...i,
      stock_condition: i.stock_condition || 'GOOD',
      pending_allocation_count: i.pending_allocation_count || 0,
      fulfillment_status: i.fulfillment_status || 'PENDING_FULFILLMENT',
    }),
  },
  daily_quotas: {
    delegate: 'daily_quotas',
    softDelete: true,
    hasTimestamps: true,
    toRecord: (q) => q,
    toDrizzle: (q) => q,
  },
  item_stocks: {
    delegate: 'item_stocks',
    softDelete: true,
    hasTimestamps: true,
    toRecord: (s) => s,
    toDrizzle: (s) => ({
      ...s,
      pending_allocation_count: s.pending_allocation_count || 0,
    }),
  },
  planned_routes: {
    delegate: 'planned_routes',
    softDelete: false,
    hasTimestamps: true,
    toRecord: (r) => r,
    toDrizzle: (r) => r,
  },
  check_in_logs: {
    delegate: 'check_in_logs',
    softDelete: false,
    hasTimestamps: true,
    toRecord: (c) => c,
    toDrizzle: (c) => c,
  },
  prediction_logs: {
    delegate: 'prediction_logs',
    softDelete: false,
    hasTimestamps: true,
    toRecord: (p) => p,
    toDrizzle: (p) => p,
  },
  recommended_orders: {
    delegate: 'recommended_orders',
    softDelete: false,
    hasTimestamps: true,
    toRecord: (r) => r,
    toDrizzle: (r) => r,
  },
  price_books: {
    delegate: 'price_books',
    softDelete: false,
    hasTimestamps: true,
    toRecord: (p) => p,
    toDrizzle: (p) => p,
  },
  price_book_items: {
    delegate: 'price_book_items',
    softDelete: false,
    hasTimestamps: true,
    toRecord: (p) => p,
    toDrizzle: (p) => p,
  },
  exchange_rates: {
    delegate: 'exchange_rates',
    softDelete: false,
    hasTimestamps: false,
    toRecord: (e) => e,
    toDrizzle: (e) => e,
  },
  rep_scores: {
    delegate: 'rep_scores',
    softDelete: false,
    hasTimestamps: true,
    toRecord: (s) => s,
    toDrizzle: (s) => ({
      ...s,
      badges: s.badges || '[]',
    }),
  },
  points_logs: {
    delegate: 'points_logs',
    softDelete: false,
    hasTimestamps: false,
    toRecord: (p) => p,
    toDrizzle: (p) => p,
  },
  brands: {
    delegate: 'brands',
    softDelete: true,
    hasTimestamps: true,
    toRecord: (b) => b,
    toDrizzle: (b) => b,
  },
  stock_locations: {
    delegate: 'stock_locations',
    softDelete: true,
    hasTimestamps: true,
    toRecord: (s) => s,
    toDrizzle: (s) => s,
  },
  stock_balances: {
    delegate: 'stock_balances',
    softDelete: true,
    hasTimestamps: true,
    toRecord: (s) => s,
    toDrizzle: (s) => s,
  },
  projects: {
    delegate: 'projects',
    softDelete: true,
    hasTimestamps: true,
    toRecord: (p) => p,
    toDrizzle: (p) => p,
  },
};

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly aiService: AiService,
  ) {}

  // ── Pull ──────────────────────────────────────────────────────────

  async pullChanges(
    lastPulledAt: number,
    deviceId?: string,
    userId?: string,
  ): Promise<PullChangesResponse> {
    const pullOne = async (
      tableName: string,
      cfg: TableSyncConfig,
    ): Promise<WatermelonChangeSet<unknown>> => {
      const table = (schema.pgSchema as any)[cfg.delegate];
      if (!table) {
        throw new Error(`Drizzle table for ${cfg.delegate} is not defined`);
      }

      if (!cfg.hasTimestamps) {
        const all = await this.drizzle.db.select().from(table);
        return { created: all.map(cfg.toRecord), updated: [], deleted: [] };
      }

      const [newRecords, updated, softDeleted] = await Promise.all([
        this.drizzle.db
          .select()
          .from(table)
          .where(gt(table.created_at, lastPulledAt)),
        this.drizzle.db
          .select()
          .from(table)
          .where(
            and(
              gt(table.updated_at, lastPulledAt),
              lte(table.created_at, lastPulledAt),
              cfg.softDelete ? isNull(table.deleted_at) : undefined,
            ),
          ),
        cfg.softDelete
          ? this.drizzle.db
              .select({ id: table.id })
              .from(table)
              .where(gt(table.deleted_at, lastPulledAt))
          : Promise.resolve([]),
      ]);

      const softDeletedIds = new Set(softDeleted.map((r: any) => r.id));
      const created = newRecords.filter((r: any) => !softDeletedIds.has(r.id));
      const newlyDeleted = newRecords
        .filter((r: any) => softDeletedIds.has(r.id))
        .map((r: any) => ({ id: r.id }));
      const deleted = [...softDeleted, ...newlyDeleted];

      return {
        created: created.map(cfg.toRecord),
        updated: updated.map(cfg.toRecord),
        deleted: deleted.map((r: any) => r.id),
      };
    };

    const entries = Object.entries(TABLE_REGISTRY);
    const results = await Promise.all(
      entries.map(([tableName, cfg]) => pullOne(tableName, cfg)),
    );

    const changes: Record<string, WatermelonChangeSet<unknown>> = {};
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
          id: crypto.randomUUID(),
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

    return { changes: changes as any, timestamp: Date.now() };
  }

  // ── Push ──────────────────────────────────────────────────────────

  async pushChanges(
    changes: PushChangesBody['changes'],
    deviceId?: string,
    userId?: string,
  ): Promise<void> {
    let totalPushed = 0;
    for (const changeset of Object.values(changes || {})) {
      if (!changeset) continue;
      const c = changeset as any;
      totalPushed +=
        (c.created?.length || 0) +
        (c.updated?.length || 0) +
        (c.deleted?.length || 0);
    }

    const [, error] = await guardAsync(
      this.drizzle.db.transaction(async (tx) => {
        for (const [tableName, cfg] of Object.entries(TABLE_REGISTRY)) {
          const changeset = (changes as Record<string, unknown>)[tableName] as
            | WatermelonChangeSet<{ id: string }>
            | undefined;
          if (!changeset) continue;

          const table = (schema.pgSchema as any)[cfg.delegate];
          if (!table) continue;

          // Creates
          if (changeset.created.length > 0) {
            await tx
              .insert(table)
              .values(changeset.created.map(cfg.toDrizzle))
              .onConflictDoNothing();
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
                .catch((err: any) => {
                  this.logger.warn(
                    `Could not create missing update record ${record.id}: ${err.message}`,
                  );
                });
              continue;
            }

            const incomingTime = incomingDrizzle.updated_at || 0;
            const existingTime = existing.updated_at || 0;

            if (incomingTime > existingTime) {
              await tx
                .update(table)
                .set(incomingDrizzle)
                .where(eq(table.id, record.id));
            } else {
              const patchData: Record<string, any> = {};
              for (const [key, val] of Object.entries(incomingDrizzle)) {
                if (val !== undefined && val !== null) {
                  const existingVal = (existing as any)[key];
                  if (
                    existingVal === null ||
                    existingVal === undefined ||
                    existingVal === ''
                  ) {
                    patchData[key] = val;
                  }
                }
              }

              patchData.updated_at = existing.updated_at;

              if (Object.keys(patchData).length > 1) {
                await tx
                  .update(table)
                  .set(patchData)
                  .where(eq(table.id, record.id));
              }
            }
          }

          // Deletes
          if (changeset.deleted.length > 0) {
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
          id: crypto.randomUUID(),
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

    this.triggerAuditForPushedLogs(changes.interaction_logs).catch((err) => {
      this.logger.error(
        `Failed to trigger post-push screenshot audit: ${err.message}`,
      );
    });
  }

  private async triggerAuditForPushedLogs(
    logChangeset: WatermelonChangeSet<any> | undefined,
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
          this.aiService.processScreenshot(logId, filePath).catch((err) => {
            this.logger.error(
              `Error processing screenshot for pushed log ${logId}: ${err.message}`,
            );
          });
        }
      }
    }
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

  async getSyncLogs() {
    const logs = await this.drizzle.db
      .select()
      .from(schema.pgSchema.sync_audit_logs)
      .orderBy(desc(schema.pgSchema.sync_audit_logs.created_at))
      .limit(50);

    const userIds = [
      ...new Set(logs.map((l) => l.user_id).filter(Boolean)),
    ] as string[];

    let users: any[] = [];
    if (userIds.length > 0) {
      users = await this.drizzle.db
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
    const parseCSV = (text: string): any[] => {
      const lines = text.split(/\r?\n/);
      if (lines.length <= 1) return [];

      const headers = lines[0]
        .split(',')
        .map((h) => h.trim().replace(/^["']|["']$/g, ''));
      const parsedRows = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values: string[] = [];
        let insideQuote = false;
        let currentVal = '';

        for (let j = 0; j < line.length; j++) {
          const char = line[j];
          if (char === '"' || char === "'") {
            insideQuote = !insideQuote;
          } else if (char === ',' && !insideQuote) {
            values.push(currentVal.trim());
            currentVal = '';
          } else {
            currentVal += char;
          }
        }
        values.push(currentVal.trim());

        const rowData: Record<string, string> = {};
        headers.forEach((header, index) => {
          let val = values[index] || '';
          val = val.replace(/^["']|["']$/g, '');
          rowData[header] = val;
        });
        parsedRows.push(rowData);
      }
      return parsedRows;
    };

    const rows = parseCSV(csvText);
    let importedCount = 0;
    const warnings: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const name = row['Name'] || row['name'];
      const address = row['Address'] || row['address'];
      const regionName = row['Region'] || row['region'];
      const division = row['Division'] || row['division'] || 'Unknown Division';
      const contactName =
        row['ContactName'] ||
        row['contactName'] ||
        row['Contact Name'] ||
        row['contact_name'];
      const phoneNumber =
        row['PhoneNumber'] ||
        row['phoneNumber'] ||
        row['Phone Number'] ||
        row['phone_number'];
      const email = row['Email'] || row['email'];
      const priceTier =
        row['PriceTier'] ||
        row['priceTier'] ||
        row['Price Tier'] ||
        row['price_tier'] ||
        'Retailer';
      const ltvVal =
        row['LifetimeValue'] ||
        row['lifetimeValue'] ||
        row['Lifetime Value'] ||
        row['lifetime_value'] ||
        '0';

      if (!name || !phoneNumber) {
        warnings.push(
          `Row ${i + 2}: Skipped due to missing Name or Phone Number.`,
        );
        continue;
      }

      const contacts = await this.drizzle.db
        .select()
        .from(schema.pgSchema.contacts)
        .where(eq(schema.pgSchema.contacts.phone_number, phoneNumber))
        .limit(1);
      const existingContact = contacts[0] || null;

      if (existingContact) {
        const existingShops = await this.drizzle.db
          .select({ name: schema.pgSchema.shops.name })
          .from(schema.pgSchema.shops)
          .where(eq(schema.pgSchema.shops.id, existingContact.shop_id))
          .limit(1);
        const existingShop = existingShops[0] || null;
        warnings.push(
          `Row ${i + 2}: Skipped duplicate phone number '${phoneNumber}' (exists for contact '${
            existingContact.name
          }' at shop '${existingShop?.name || 'Unknown'}').`,
        );
        continue;
      }

      let region = null;
      if (regionName) {
        const regions = await this.drizzle.db
          .select()
          .from(schema.pgSchema.regions)
          .where(eq(schema.pgSchema.regions.name, regionName))
          .limit(1);
        region = regions[0] || null;

        if (!region) {
          const newRegionId = `region-${regionName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
          const newRegions = await this.drizzle.db
            .insert(schema.pgSchema.regions)
            .values({
              id: newRegionId,
              name: regionName,
              division: division,
              created_at: Date.now(),
              updated_at: Date.now(),
            })
            .returning();
          region = newRegions[0];
        }
      }

      const finalRegionId = region ? region.id : 'region-yangon';

      const shopId = `shop-${crypto.randomUUID()}`;
      const newShops = await this.drizzle.db
        .insert(schema.pgSchema.shops)
        .values({
          id: shopId,
          name,
          address: address || 'No Address',
          region_id: finalRegionId,
          price_tier: priceTier,
          lifetime_value: parseFloat(ltvVal) || 0.0,
          sentiment_trend: 'STABLE',
          created_at: Date.now(),
          updated_at: Date.now(),
        })
        .returning();
      const shop = newShops[0];

      const contactId = `contact-${crypto.randomUUID()}`;
      await this.drizzle.db.insert(schema.pgSchema.contacts).values({
        id: contactId,
        shop_id: shop.id,
        name: contactName || 'Primary Contact',
        phone_number: phoneNumber,
        email: email || null,
        is_primary: true,
        created_at: Date.now(),
        updated_at: Date.now(),
      });

      importedCount++;
    }

    return { importedCount, warnings };
  }
}
