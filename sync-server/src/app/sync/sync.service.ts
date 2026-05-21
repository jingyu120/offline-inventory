import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { guardAsync } from '@burma-inventory/shared-types';
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
      price_book_id: s.priceBookId,
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
      priceBookId: s.price_book_id,
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
      unit_price: toNum(i.unitPrice),
      selected_currency: i.selectedCurrency,
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
      unitPrice: i.unit_price,
      selectedCurrency: i.selected_currency,
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
  planned_routes: {
    delegate: 'plannedRoute',
    softDelete: false,
    hasTimestamps: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toRecord: (r: any) => ({
      id: r.id,
      rep_id: r.repId,
      date: r.date,
      shop_ids: r.shopIds,
      ...mapTimestampsRecord(r),
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toPrisma: (r: any) => ({
      id: r.id,
      repId: r.rep_id,
      date: r.date,
      shopIds: r.shop_ids,
      ...mapTimestampsPrisma(r),
    }),
  },
  check_in_logs: {
    delegate: 'checkInLog',
    softDelete: false,
    hasTimestamps: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toRecord: (r: any) => ({
      id: r.id,
      shop_id: r.shopId,
      rep_id: r.repId,
      check_in_time: r.checkInTime.getTime(),
      latitude: r.latitude,
      longitude: r.longitude,
      verified: r.verified,
      ...mapTimestampsRecord(r),
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toPrisma: (r: any) => ({
      id: r.id,
      shopId: r.shop_id,
      repId: r.rep_id,
      checkInTime: new Date(r.check_in_time),
      latitude: r.latitude,
      longitude: r.longitude,
      verified: r.verified,
      ...mapTimestampsPrisma(r),
    }),
  },
  prediction_logs: {
    delegate: 'predictionLog',
    softDelete: false,
    hasTimestamps: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toRecord: (r: any) => ({
      id: r.id,
      shop_id: r.shopId,
      predicted_ltv: r.predictedLtv,
      churn_risk: r.churnRisk,
      stockout_risk: r.stockoutRisk,
      ...mapTimestampsRecord(r),
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toPrisma: (r: any) => ({
      id: r.id,
      shopId: r.shop_id,
      predictedLtv: r.predicted_ltv,
      churnRisk: r.churn_risk,
      stockoutRisk: r.stockout_risk,
      ...mapTimestampsPrisma(r),
    }),
  },
  recommended_orders: {
    delegate: 'recommendedOrder',
    softDelete: false,
    hasTimestamps: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toRecord: (r: any) => ({
      id: r.id,
      shop_id: r.shopId,
      item_id: r.itemId,
      quantity: r.quantity,
      confidence: r.confidence,
      ...mapTimestampsRecord(r),
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toPrisma: (r: any) => ({
      id: r.id,
      shopId: r.shop_id,
      itemId: r.item_id,
      quantity: r.quantity,
      confidence: r.confidence,
      ...mapTimestampsPrisma(r),
    }),
  },
  price_books: {
    delegate: 'priceBook',
    softDelete: false,
    hasTimestamps: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toRecord: (r: any) => ({
      id: r.id,
      name: r.name,
      region_id: r.regionId,
      ...mapTimestampsRecord(r),
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toPrisma: (r: any) => ({
      id: r.id,
      name: r.name,
      regionId: r.region_id,
      ...mapTimestampsPrisma(r),
    }),
  },
  price_book_items: {
    delegate: 'priceBookItem',
    softDelete: false,
    hasTimestamps: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toRecord: (r: any) => ({
      id: r.id,
      price_book_id: r.priceBookId,
      item_id: r.itemId,
      price: toNum(r.price),
      currency: r.currency,
      ...mapTimestampsRecord(r),
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toPrisma: (r: any) => ({
      id: r.id,
      priceBookId: r.price_book_id,
      itemId: r.item_id,
      price: r.price,
      currency: r.currency,
      ...mapTimestampsPrisma(r),
    }),
  },
  exchange_rates: {
    delegate: 'exchangeRate',
    softDelete: false,
    hasTimestamps: false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toRecord: (r: any) => ({
      id: r.id,
      from_currency: r.fromCurrency,
      to_currency: r.toCurrency,
      rate: toNum(r.rate),
      updated_at: r.updatedAt.getTime(),
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toPrisma: (r: any) => ({
      id: r.id,
      fromCurrency: r.from_currency,
      toCurrency: r.to_currency,
      rate: r.rate,
      updatedAt: new Date(r.updated_at),
    }),
  },
  rep_scores: {
    delegate: 'repScore',
    softDelete: false,
    hasTimestamps: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toRecord: (r: any) => ({
      id: r.id,
      rep_id: r.repId,
      points: r.points,
      streak_days: r.streakDays,
      badges: r.badges,
      ...mapTimestampsRecord(r),
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toPrisma: (r: any) => ({
      id: r.id,
      repId: r.rep_id,
      points: r.points,
      streakDays: r.streak_days,
      badges: r.badges,
      ...mapTimestampsPrisma(r),
    }),
  },
  points_logs: {
    delegate: 'pointsLog',
    softDelete: false,
    hasTimestamps: false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toRecord: (r: any) => ({
      id: r.id,
      rep_id: r.repId,
      points_added: r.pointsAdded,
      reason: r.reason,
      created_at: r.createdAt.getTime(),
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toPrisma: (r: any) => ({
      id: r.id,
      repId: r.rep_id,
      pointsAdded: r.points_added,
      reason: r.reason,
      createdAt: new Date(r.created_at),
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
    const [, error] = await guardAsync(
      this.prisma.$transaction(async (tx) => {
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
      }),
    );

    if (error) {
      this.logger.error(
        `Failed to push sync changes: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }
}
