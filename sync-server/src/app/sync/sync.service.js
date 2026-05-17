let SyncService_1;
import { __decorate, __metadata } from 'tslib';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma';
/** Helper: safely convert Prisma DateTime → epoch ms, or null */
const toEpoch = (d) => (d ? d.getTime() : null);
/** Helper: safely convert Prisma Decimal → number */

const toNum = (d) => (typeof d === 'number' ? d : (d?.toNumber?.() ?? 0));
// ─── Registry ───────────────────────────────────────────────────────
// Order matters for push (FK dependencies: regions → shops → contacts, etc.)
const TABLE_REGISTRY = {
  regions: {
    delegate: 'region',
    softDelete: true,
    hasTimestamps: true,

    toRecord: (r) => ({
      id: r.id,
      name: r.name,
      division: r.division,
      created_at: r.createdAt.getTime(),
      updated_at: r.updatedAt.getTime(),
    }),

    toPrisma: (r) => ({
      id: r.id,
      name: r.name,
      division: r.division,
      createdAt: new Date(r.created_at),
      updatedAt: new Date(r.updated_at),
    }),
  },
  shops: {
    delegate: 'shop',
    softDelete: true,
    hasTimestamps: true,

    toRecord: (s) => ({
      id: s.id,
      name: s.name,
      address: s.address,
      latitude: s.latitude,
      longitude: s.longitude,
      region_id: s.regionId,
      assigned_rep_id: s.assignedRepId,
      lifetime_value: toNum(s.lifetimeValue),
      sentiment_trend: s.sentimentTrend,
      created_at: s.createdAt.getTime(),
      updated_at: s.updatedAt.getTime(),
    }),

    toPrisma: (s) => ({
      id: s.id,
      name: s.name,
      address: s.address,
      latitude: s.latitude,
      longitude: s.longitude,
      regionId: s.region_id,
      assignedRepId: s.assigned_rep_id,
      lifetimeValue: s.lifetime_value,
      sentimentTrend: s.sentiment_trend,
      createdAt: new Date(s.created_at),
      updatedAt: new Date(s.updated_at),
    }),
  },
  contacts: {
    delegate: 'contact',
    softDelete: true,
    hasTimestamps: true,

    toRecord: (c) => ({
      id: c.id,
      shop_id: c.shopId,
      name: c.name,
      phone_number: c.phoneNumber,
      email: c.email,
      is_primary: c.isPrimary,
      created_at: c.createdAt.getTime(),
      updated_at: c.updatedAt.getTime(),
    }),

    toPrisma: (c) => ({
      id: c.id,
      shopId: c.shop_id,
      name: c.name,
      phoneNumber: c.phone_number,
      email: c.email,
      isPrimary: c.is_primary,
      createdAt: new Date(c.created_at),
      updatedAt: new Date(c.updated_at),
    }),
  },
  items: {
    delegate: 'item',
    softDelete: true,
    hasTimestamps: true,

    toRecord: (i) => ({
      id: i.id,
      sku: i.sku,
      name: i.name,
      unit_price: toNum(i.unitPrice),
      category: i.category,
      created_at: i.createdAt.getTime(),
      updated_at: i.updatedAt.getTime(),
    }),

    toPrisma: (i) => ({
      id: i.id,
      sku: i.sku,
      name: i.name,
      unitPrice: i.unit_price,
      category: i.category,
      createdAt: new Date(i.created_at),
      updatedAt: new Date(i.updated_at),
    }),
  },
  interaction_logs: {
    delegate: 'interactionLog',
    softDelete: true,
    hasTimestamps: true,

    toRecord: (l) => ({
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
      created_at: l.createdAt.getTime(),
      updated_at: l.updatedAt.getTime(),
    }),

    toPrisma: (l) => ({
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
      createdAt: new Date(l.created_at),
      updatedAt: new Date(l.updated_at),
    }),
  },
  interaction_items: {
    delegate: 'interactionItem',
    softDelete: false, // Join table — hard delete
    hasTimestamps: false,

    toRecord: (i) => ({
      id: i.id,
      interaction_log_id: i.interactionLogId,
      item_id: i.itemId,
      quantity: i.quantity,
      unit_price_at_sale: toNum(i.unitPriceAtSale),
      interest_level: i.interestLevel,
    }),

    toPrisma: (i) => ({
      id: i.id,
      interactionLogId: i.interaction_log_id,
      itemId: i.item_id,
      quantity: i.quantity,
      unitPriceAtSale: i.unit_price_at_sale,
      interestLevel: i.interest_level,
    }),
  },
  daily_quotas: {
    delegate: 'dailyQuota',
    softDelete: true,
    hasTimestamps: true,

    toRecord: (q) => ({
      id: q.id,
      user_id: q.userId,
      target_visits: q.targetVisits,
      target_phone: q.targetPhone,
      target_viber: q.targetViber,
      effective_from: q.effectiveFrom.getTime(),
      created_at: q.createdAt.getTime(),
      updated_at: q.updatedAt.getTime(),
    }),

    toPrisma: (q) => ({
      id: q.id,
      userId: q.user_id,
      targetVisits: q.target_visits,
      targetPhone: q.target_phone,
      targetViber: q.target_viber,
      effectiveFrom: new Date(q.effective_from),
      createdAt: new Date(q.created_at),
      updatedAt: new Date(q.updated_at),
    }),
  },
};
// ─── Service ────────────────────────────────────────────────────────
let SyncService = (SyncService_1 = class SyncService {
  constructor(prisma) {
    this.prisma = prisma;
    this.logger = new Logger(SyncService_1.name);
  }
  // ── Pull ──────────────────────────────────────────────────────────
  async pullChanges(lastPulledAt) {
    const since = new Date(lastPulledAt || 0);
    const pullOne = async (cfg) => {
      const model = this.prisma[cfg.delegate];
      if (!cfg.hasTimestamps) {
        // Tables without timestamps: return all as "created" on first sync
        const all = await model.findMany();
        return { created: all.map(cfg.toRecord), updated: [], deleted: [] };
      }
      const [created, updated, deleted] = await Promise.all([
        model.findMany({
          where: { createdAt: { gt: since }, deletedAt: null },
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
      return {
        created: created.map(cfg.toRecord),
        updated: updated.map(cfg.toRecord),

        deleted: deleted.map((r) => r.id),
      };
    };
    const entries = Object.entries(TABLE_REGISTRY);
    const results = await Promise.all(entries.map(([, cfg]) => pullOne(cfg)));
    const changes = {};
    entries.forEach(([tableName], i) => {
      changes[tableName] = results[i];
    });

    return { changes: changes, timestamp: Date.now() };
  }
  // ── Push ──────────────────────────────────────────────────────────
  async pushChanges(changes) {
    await this.prisma.$transaction(async (tx) => {
      // Process tables in registry order (FK-safe)
      for (const [tableName, cfg] of Object.entries(TABLE_REGISTRY)) {
        const changeset = changes[tableName];
        if (!changeset) continue;

        const model = tx[cfg.delegate];
        // Creates
        if (changeset.created.length > 0) {
          await model.createMany({
            data: changeset.created.map(cfg.toPrisma),
            skipDuplicates: true,
          });
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
});
SyncService = SyncService_1 = __decorate(
  [Injectable(), __metadata('design:paramtypes', [PrismaService])],
  SyncService,
);
export { SyncService };
//# sourceMappingURL=sync.service.js.map
