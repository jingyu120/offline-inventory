import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { guardAsync } from '@burma-inventory/shared-types';
import { AiService } from '../ai/ai.service';
import * as fs from 'fs';
import * as path from 'path';
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
      price_tier: s.priceTier,
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
      priceTier: s.price_tier,
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
      brand_id: i.brandId,
      thickness: i.thickness,
      weight: i.weight,
      unit_type: i.unitType,
      conversion_factor: i.conversionFactor,
      color: i.color,
      material_sub_type: i.materialSubType,
      hardware_finish: i.hardwareFinish,
      is_in_deficit: i.isInDeficit,
      ...mapTimestampsRecord(i),
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toPrisma: (i: any) => ({
      id: i.id,
      sku: i.sku,
      name: i.name,
      unitPrice: i.unit_price,
      category: i.category,
      brandId: i.brand_id,
      thickness: i.thickness,
      weight: i.weight,
      unitType: i.unit_type,
      conversionFactor: i.conversion_factor,
      color: i.color,
      materialSubType: i.material_sub_type,
      hardwareFinish: i.hardware_finish,
      isInDeficit: i.is_in_deficit,
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
      project_id: l.projectId,
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
      projectId: l.project_id,
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
      selected_unit: i.selectedUnit,
      stock_condition: i.stockCondition,
      pending_allocation_count: i.pendingAllocationCount,
      fulfillment_status: i.fulfillmentStatus,
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
      selectedUnit: i.selected_unit,
      stockCondition: i.stock_condition || 'GOOD',
      pendingAllocationCount: i.pending_allocation_count || 0,
      fulfillmentStatus: i.fulfillment_status || 'PENDING_FULFILLMENT',
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
      pending_allocation_count: s.pendingAllocationCount,
      ...mapTimestampsRecord(s),
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toPrisma: (s: any) => ({
      id: s.id,
      itemId: s.item_id,
      quantity: s.quantity,
      pendingAllocationCount: s.pending_allocation_count || 0,
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
  brands: {
    delegate: 'brand',
    softDelete: true,
    hasTimestamps: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toRecord: (b: any) => ({
      id: b.id,
      name: b.name,
      ...mapTimestampsRecord(b),
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toPrisma: (b: any) => ({
      id: b.id,
      name: b.name,
      ...mapTimestampsPrisma(b),
    }),
  },
  stock_locations: {
    delegate: 'stockLocation',
    softDelete: true,
    hasTimestamps: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toRecord: (l: any) => ({
      id: l.id,
      name: l.name,
      ...mapTimestampsRecord(l),
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toPrisma: (l: any) => ({
      id: l.id,
      name: l.name,
      ...mapTimestampsPrisma(l),
    }),
  },
  stock_balances: {
    delegate: 'stockBalance',
    softDelete: true,
    hasTimestamps: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toRecord: (b: any) => ({
      id: b.id,
      item_id: b.itemId,
      location_id: b.locationId,
      quantity: b.quantity,
      ...mapTimestampsRecord(b),
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toPrisma: (b: any) => ({
      id: b.id,
      itemId: b.item_id,
      locationId: b.location_id,
      quantity: b.quantity,
      ...mapTimestampsPrisma(b),
    }),
  },
  projects: {
    delegate: 'project',
    softDelete: true,
    hasTimestamps: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toRecord: (p: any) => ({
      id: p.id,
      name: p.name,
      ...mapTimestampsRecord(p),
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toPrisma: (p: any) => ({
      id: p.id,
      name: p.name,
      ...mapTimestampsPrisma(p),
    }),
  },
};

// ─── Service ────────────────────────────────────────────────────────

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  // ── Pull ──────────────────────────────────────────────────────────

  async pullChanges(
    lastPulledAt: number,
    deviceId?: string,
    userId?: string,
  ): Promise<PullChangesResponse> {
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
            ...(cfg.softDelete ? { deletedAt: null } : {}),
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
    let totalPulled = 0;
    entries.forEach(([tableName], i) => {
      changes[tableName] = results[i];
      totalPulled +=
        results[i].created.length +
        results[i].updated.length +
        results[i].deleted.length;
    });

    if (deviceId) {
      await this.prisma.syncAuditLog
        .create({
          data: {
            deviceId,
            userId: userId || null,
            action: 'PULL',
            recordsPulled: totalPulled,
            recordsPushed: 0,
            status: 'SUCCESS',
          },
        })
        .catch((err) => {
          this.logger.error(`Failed to write pull audit log: ${err.message}`);
        });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
            // Omitted for now: Treat all orders purely as 'Requested Bookings' or sales leads
            /*
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
            */
          }

          // Updates
          for (const record of changeset.updated) {
            const incomingPrisma = cfg.toPrisma(record);
            const existing = await model
              .findUnique({ where: { id: record.id } })
              .catch(() => null);

            if (!existing) {
              // If the record doesn't exist on the server yet, create it
              await model
                .create({
                  data: incomingPrisma,
                })
                .catch((err: any) => {
                  this.logger.warn(
                    `Could not create missing update record ${record.id}: ${err.message}`,
                  );
                });
              continue;
            }

            const incomingTime =
              incomingPrisma.updatedAt instanceof Date
                ? incomingPrisma.updatedAt.getTime()
                : 0;
            const existingTime =
              existing.updatedAt instanceof Date
                ? existing.updatedAt.getTime()
                : 0;

            if (incomingTime > existingTime) {
              // Client is newer: patch all incoming fields
              await model.update({
                where: { id: record.id },
                data: incomingPrisma,
              });
            } else {
              // Server is newer (conflict): only patch fields that are null/empty on the server
              const patchData: Record<string, any> = {};
              for (const [key, val] of Object.entries(incomingPrisma)) {
                if (val !== undefined && val !== null) {
                  const existingVal = existing[key];
                  if (
                    existingVal === null ||
                    existingVal === undefined ||
                    existingVal === ''
                  ) {
                    patchData[key] = val;
                  }
                }
              }

              // Keep server's newer updatedAt
              patchData.updatedAt = existing.updatedAt;

              if (Object.keys(patchData).length > 1) {
                await model.update({
                  where: { id: record.id },
                  data: patchData,
                });
              }
            }
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

    if (deviceId) {
      await this.prisma.syncAuditLog
        .create({
          data: {
            deviceId,
            userId: userId || null,
            action: 'PUSH',
            recordsPulled: 0,
            recordsPushed: totalPushed,
            status: error ? 'FAILED' : 'SUCCESS',
            errorMessage: error ? (error as Error).message : null,
          },
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

    // Trigger post-push screenshot audit for newly pushed logs that contain screenshots
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
      const log = await this.prisma.interactionLog.findUnique({
        where: { id: logId },
      });
      if (log && log.viberScreenshotUrl && !log.aiVerificationStatus) {
        const filename = path.basename(log.viberScreenshotUrl);
        const filePath = path.join(process.cwd(), 'uploads', filename);
        if (fs.existsSync(filePath)) {
          this.logger.log(
            `Post-push hook matched file ${filename} for log ${logId}. Starting audit...`,
          );
          // Trigger vision processing asynchronously
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
    const existing = await this.prisma.interactionLog
      .findUnique({
        where: { id: interactionLogId },
      })
      .catch(() => null);

    if (existing) {
      await this.prisma.interactionLog.update({
        where: { id: interactionLogId },
        data: {
          viberScreenshotUrl: url,
          updatedAt: new Date(),
        },
      });
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
    const logs = await this.prisma.syncAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const userIds = [
      ...new Set(logs.map((l) => l.userId).filter(Boolean)),
    ] as string[];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, role: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));
    return logs.map((l) => ({
      ...l,
      user: l.userId ? userMap.get(l.userId) : null,
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

      // Check duplicate phone number in DB
      const existingContact = await this.prisma.contact.findFirst({
        where: { phoneNumber },
      });

      if (existingContact) {
        const existingShop = await this.prisma.shop
          .findUnique({
            where: { id: existingContact.shopId },
            select: { name: true },
          })
          .catch(() => null);
        warnings.push(
          `Row ${i + 2}: Skipped duplicate phone number '${phoneNumber}' (exists for contact '${
            existingContact.name
          }' at shop '${existingShop?.name || 'Unknown'}').`,
        );
        continue;
      }

      // Resolve Region
      let region = null;
      if (regionName) {
        region = await this.prisma.region.findFirst({
          where: { name: regionName },
        });

        if (!region) {
          region = await this.prisma.region.create({
            data: {
              name: regionName,
              division: division,
            },
          });
        }
      }

      const finalRegionId = region ? region.id : 'region-yangon';

      // Create Shop
      const shop = await this.prisma.shop.create({
        data: {
          name,
          address: address || 'No Address',
          regionId: finalRegionId,
          priceTier: priceTier,
          lifetimeValue: parseFloat(ltvVal) || 0.0,
        },
      });

      // Create Contact
      await this.prisma.contact.create({
        data: {
          shopId: shop.id,
          name: contactName || 'Primary Contact',
          phoneNumber,
          email: email || null,
          isPrimary: true,
        },
      });

      importedCount++;
    }

    return { importedCount, warnings };
  }
}
