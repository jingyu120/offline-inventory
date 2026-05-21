import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma';
import type {
  PullChangesResponse,
  PushChangesBody,
  WatermelonChangeSet,
} from '@burma-inventory/shared-types';

// ─── Table Sync Configuration ───────────────────────────────────────
// Each entry maps a WatermelonDB table name to its Prisma delegate,
// pull mapper (Prisma→WatermelonDB record), and push mapper (record→Prisma).
// Adding a new table to sync only requires adding one entry here.

interface TableSyncConfig<TRecord = unknown> {
  /** Prisma delegate accessor name (e.g. 'region', 'shop') */
  delegate: string;
  /** Whether this table supports soft deletes (has deletedAt field) */
  softDelete: boolean;
  /** Whether this table has createdAt/updatedAt for incremental pull */
  hasTimestamps: boolean;
  /** Prisma row → WatermelonDB sync record */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toRecord: (row: any) => TRecord;
  /** WatermelonDB sync record → Prisma create/update data */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toPrisma: (record: TRecord) => any;
}

/** Helper: safely convert Prisma DateTime → epoch ms, or null */
const toEpoch = (d: Date | null | undefined): number | null =>
  d ? d.getTime() : null;

/** Helper: safely convert Prisma Decimal → number */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toNum = (d: any): number =>
  typeof d === 'number' ? d : (d?.toNumber?.() ?? 0);

/** Helper: maps standard timestamps to watermelon schema record */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapTimestampsRecord = (r: any) => ({
  created_at: r.createdAt.getTime(),
  updated_at: r.updatedAt.getTime(),
});

/** Helper: maps standard timestamps to prisma model */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapTimestampsPrisma = (r: any) => ({
  createdAt: new Date(r.created_at),
  updatedAt: new Date(r.updated_at),
});

// ─── Registry ───────────────────────────────────────────────────────
// Order matters for push (FK dependencies: regions → shops → contacts, etc.)
const TABLE_REGISTRY: Record<string, TableSyncConfig> = {
  regions: {
    delegate: 'region',
    softDelete: true,
    hasTimestamps: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toRecord: (r: any) => ({
      id: r.id,
      name: r.name,
      division: r.division,
      ...mapTimestampsRecord(r),
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toPrisma: (r: any) => ({
      id: r.id,
      name: r.name,
      division: r.division,
      ...mapTimestampsPrisma(r),
    }),
  },
  shops: {
    delegate: 'shop',
    softDelete: true,
    hasTimestamps: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toRecord: (s: any) => ({
      id: s.id,
      name: s.name,
      address: s.address,
      latitude: s.latitude,
      longitude: s.longitude,
      region_id: s.regionId,
      assigned_rep_id: s.assignedRepId,
      lifetime_value: toNum(s.lifetimeValue),
      sentiment_trend: s.sentimentTrend,
      ...mapTimestampsRecord(s),
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toPrisma: (s: any) => ({
      id: s.id,
      name: s.name,
      address: s.address,
      latitude: s.latitude,
      longitude: s.longitude,
      regionId: s.region_id,
      assignedRepId: s.assigned_rep_id,
      lifetimeValue: s.lifetime_value,
      sentimentTrend: s.sentiment_trend,
      ...mapTimestampsPrisma(s),
    }),
  },
  contacts: {
    delegate: 'contact',
    softDelete: true,
    hasTimestamps: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toRecord: (c: any) => ({
      id: c.id,
      shop_id: c.shopId,
      name: c.name,
      phone_number: c.phoneNumber,
      email: c.email,
      is_primary: c.isPrimary,
      ...mapTimestampsRecord(c),
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toPrisma: (c: any) => ({
      id: c.id,
      shopId: c.shop_id,
      name: c.name,
      phoneNumber: c.phone_number,
      email: c.email,
      isPrimary: c.is_primary,
      ...mapTimestampsPrisma(c),
    }),
  },
  items: {
    delegate: 'item',
    softDelete: true,
    hasTimestamps: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toRecord: (i: any) => ({
      id: i.id,
      sku: i.sku,
      name: i.name,
      unit_price: toNum(i.unitPrice),
      category: i.category,
      ...mapTimestampsRecord(i),
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toPrisma: (i: any) => ({
      id: i.id,
      sku: i.sku,
      name: i.name,
      unitPrice: i.unit_price,
      category: i.category,
      ...mapTimestampsPrisma(i),
    }),
  },
  interaction_logs: {
    delegate: 'interactionLog',
    softDelete: true,
    hasTimestamps: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toRecord: (l: any) => ({
      id: l.id,
      shop_id: l.shopId,
      rep_id: l.repId,
      type: l.type,
      commercial_status: l.commercialStatus,
      notes: l.notes,
      next_follow_up_date: toEpoch(l.nextFollowUpDate),
      viber_screenshot_url: l.viberScreenshotUrl,
      created_at_local: l.createdAtLocal.getTime(),
      synced_at_server: toEpoch(l.syncedAtServer),
      is_offline_entry: l.isOfflineEntry,
      device_id: l.deviceId,
      ...mapTimestampsRecord(l),
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toPrisma: (l: any) => ({
      id: l.id,
      shopId: l.shop_id,
      repId: l.rep_id,
      type: l.type,
      commercialStatus: l.commercial_status,
      notes: l.notes,
      nextFollowUpDate: l.next_follow_up_date
        ? new Date(l.next_follow_up_date)
        : null,
      viberScreenshotUrl: l.viber_screenshot_url,
      createdAtLocal: new Date(l.created_at_local),
      syncedAtServer: new Date(),
      isOfflineEntry: l.is_offline_entry,
      deviceId: l.device_id,
      ...mapTimestampsPrisma(l),
    }),
  },
  interaction_items: {
    delegate: 'interactionItem',
    softDelete: true,
    hasTimestamps: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toRecord: (i: any) => ({
      id: i.id,
      interaction_log_id: i.interactionLogId,
      item_id: i.itemId,
      quantity: i.quantity,
      unit_price_at_sale: toNum(i.unitPriceAtSale),
      interest_level: i.interestLevel,
      ...mapTimestampsRecord(i),
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toPrisma: (i: any) => ({
      id: i.id,
      interactionLogId: i.interaction_log_id,
      itemId: i.item_id,
      quantity: i.quantity,
      unitPriceAtSale: i.unit_price_at_sale,
      interestLevel: i.interest_level,
      ...mapTimestampsPrisma(i),
    }),
  },
  daily_quotas: {
    delegate: 'dailyQuota',
    softDelete: true,
    hasTimestamps: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toRecord: (q: any) => ({
      id: q.id,
      user_id: q.userId,
      target_visits: q.targetVisits,
      target_phone: q.targetPhone,
      target_viber: q.targetViber,
      effective_from: q.effectiveFrom.getTime(),
      ...mapTimestampsRecord(q),
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toPrisma: (q: any) => ({
      id: q.id,
      userId: q.user_id,
      targetVisits: q.target_visits,
      targetPhone: q.target_phone,
      targetViber: q.target_viber,
      effectiveFrom: new Date(q.effective_from),
      ...mapTimestampsPrisma(q),
    }),
  },
  item_stocks: {
    delegate: 'itemStock',
    softDelete: true,
    hasTimestamps: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toRecord: (s: any) => ({
      id: s.id,
      item_id: s.itemId,
      quantity: s.quantity,
      ...mapTimestampsRecord(s),
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toPrisma: (s: any) => ({
      id: s.id,
      itemId: s.item_id,
      quantity: s.quantity,
      ...mapTimestampsPrisma(s),
    }),
  },
};

// ─── Service ────────────────────────────────────────────────────────

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Pull ──────────────────────────────────────────────────────────

  async pullChanges(lastPulledAt: number): Promise<PullChangesResponse> {
    const since = new Date(lastPulledAt || 0);

    const pullOne = async (
      cfg: TableSyncConfig,
    ): Promise<WatermelonChangeSet<unknown>> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const model = (this.prisma as any)[cfg.delegate];

      if (!cfg.hasTimestamps) {
        // Tables without timestamps: return all as "created" on first sync
        const all = await model.findMany();
        return { created: all.map(cfg.toRecord), updated: [], deleted: [] };
      }

      const [newRecords, updated, softDeleted] = await Promise.all([
        // Fetch ALL records created since last pull (regardless of deletion status)
        // so records that were created AND deleted in the same window are captured.
        model.findMany({
          where: { createdAt: { gt: since } },
        }),
        model.findMany({
          where: {
            updatedAt: { gt: since },
            createdAt: { lte: since },
            deletedAt: null,
          },
        }),
        cfg.softDelete
          ? model.findMany({
              where: { deletedAt: { gt: since } },
              select: { id: true },
            })
          : Promise.resolve([]),
      ]);

      // Partition new records: those already soft-deleted go to deleted[], not created[]
      const softDeletedIds = new Set(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        softDeleted.map((r: any) => r.id),
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const created = newRecords.filter((r: any) => !softDeletedIds.has(r.id));
      // Records created AND deleted in same window: add their IDs to deleted list
      const newlyDeleted = newRecords
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((r: any) => softDeletedIds.has(r.id))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((r: any) => ({ id: r.id }));
      const deleted = [...softDeleted, ...newlyDeleted];

      return {
        created: created.map(cfg.toRecord),
        updated: updated.map(cfg.toRecord),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        deleted: deleted.map((r: any) => r.id),
      };
    };

    const entries = Object.entries(TABLE_REGISTRY);
    const results = await Promise.all(entries.map(([, cfg]) => pullOne(cfg)));

    const changes: Record<string, WatermelonChangeSet<unknown>> = {};
    entries.forEach(([tableName], i) => {
      changes[tableName] = results[i];
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { changes: changes as any, timestamp: Date.now() };
  }

  // ── Push ──────────────────────────────────────────────────────────

  async pushChanges(changes: PushChangesBody['changes']): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Process tables in registry order (FK-safe)
      for (const [tableName, cfg] of Object.entries(TABLE_REGISTRY)) {
        const changeset = (changes as Record<string, unknown>)[tableName] as
          | WatermelonChangeSet<{ id: string }>
          | undefined;
        if (!changeset) continue;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const model = (tx as any)[cfg.delegate];

        // Creates
        if (changeset.created.length > 0) {
          await model.createMany({
            data: changeset.created.map(cfg.toPrisma),
            skipDuplicates: true,
          });

          // Automatically deduct stock levels when orders/quantities are created
          if (tableName === 'interaction_items') {
            for (const item of changeset.created.map(cfg.toPrisma)) {
              await tx.itemStock
                .update({
                  where: { itemId: item.itemId },
                  data: {
                    quantity: { decrement: item.quantity },
                  },
                })
                .catch((err: any) => {
                  this.logger.warn(
                    `Could not deduct stock for item ID ${item.itemId}: ${err.message}`,
                  );
                });
            }
          }
        }

        // Updates
        for (const record of changeset.updated) {
          await model.update({
            where: { id: record.id },
            data: cfg.toPrisma(record),
          });
        }

        // Deletes
        if (changeset.deleted.length > 0) {
          if (cfg.softDelete) {
            await model.updateMany({
              where: { id: { in: changeset.deleted } },
              data: { deletedAt: new Date() },
            });
          } else {
            await model.deleteMany({
              where: { id: { in: changeset.deleted } },
            });
          }
        }

        this.logger.debug(
          `[${tableName}] +${changeset.created.length} ~${changeset.updated.length} -${changeset.deleted.length}`,
        );
      }
    });
  }
}
