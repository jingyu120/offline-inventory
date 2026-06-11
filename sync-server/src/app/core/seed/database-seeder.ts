import { Logger } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '@burma-inventory/shared-types';
import * as bcrypt from 'bcryptjs';
import { sql } from 'drizzle-orm';
import { Queue } from 'bullmq';
import { env } from '../../../env';
import {
  DEFAULT_SEED_PASSWORD,
  DETERMINISTIC_ITEMS_SEED,
  DETERMINISTIC_SHOPS_SEED,
  DETERMINISTIC_USERS_SEED,
  INITIAL_EXCHANGE_RATES_SEED,
  INITIAL_ITEMS_SEED,
  INITIAL_PROJECTS_SEED,
  INITIAL_REP_SCORES_SEED,
  INITIAL_SHOPS_SEED,
  INITIAL_USERS_SEED,
  buildAuditEventsSeed,
  buildExpectedInboundsSeed,
  buildInvoicesSeed,
  buildMismatchInteractionItemSeed,
  buildMismatchInteractionLogSeed,
  buildPaymentsSeed,
  buildPendingInventoryUpdatesSeed,
} from './seed-data';

type Db = NodePgDatabase<typeof schema.pgSchema>;

const QUEUE_NAME = 'ai-tasks';

/**
 * Encapsulates all database seeding concerns previously embedded in
 * DrizzleService. Two distinct operations are exposed:
 *  - seedInitial: idempotent boot-time upsert (onConflictDoNothing + triggers).
 *  - runDeterministicSeeding: destructive wipe-and-reinsert of a fixed dataset.
 * They are intentionally NOT merged because their behavior differs.
 */
export class DatabaseSeeder {
  private readonly logger = new Logger(DatabaseSeeder.name);

  async seedInitial(db: Db): Promise<void> {
    try {
      const hashedPassword = await bcrypt.hash(DEFAULT_SEED_PASSWORD, 10);
      const now = Date.now();

      // 1. Seed Regions
      await db
        .insert(schema.pgSchema.regions)
        .values([
          {
            id: 'region-yangon',
            name: 'Yangon Region',
            division: 'Yangon Division',
            created_at: now,
            updated_at: now,
          },
          {
            id: 'region-mandalay',
            name: 'Mandalay Region',
            division: 'Mandalay Division',
            created_at: now,
            updated_at: now,
          },
        ])
        .onConflictDoNothing();

      // 1.5. Seed Townships & Wards
      await db
        .insert(schema.pgSchema.townships)
        .values([
          {
            id: 'township-kamayut',
            name: 'Kamayut Township',
            region_id: 'region-yangon',
            created_at: now,
            updated_at: now,
          },
          {
            id: 'township-lanmadaw',
            name: 'Lanmadaw Township',
            region_id: 'region-yangon',
            created_at: now,
            updated_at: now,
          },
          {
            id: 'township-chanayethazan',
            name: 'Chanayethazan Township',
            region_id: 'region-mandalay',
            created_at: now,
            updated_at: now,
          },
          {
            id: 'township-maharaundmyay',
            name: 'Mahar Aung Myay Township',
            region_id: 'region-mandalay',
            created_at: now,
            updated_at: now,
          },
        ])
        .onConflictDoNothing();

      await db
        .insert(schema.pgSchema.wards)
        .values([
          {
            id: 'ward-hledan',
            name: 'Hledan Ward',
            township_id: 'township-kamayut',
            created_at: now,
            updated_at: now,
          },
          {
            id: 'ward-sinmalaik',
            name: 'Sinmalaik Ward',
            township_id: 'township-kamayut',
            created_at: now,
            updated_at: now,
          },
          {
            id: 'ward-ward1',
            name: 'Ward 1',
            township_id: 'township-lanmadaw',
            created_at: now,
            updated_at: now,
          },
          {
            id: 'ward-ward2',
            name: 'Ward 2',
            township_id: 'township-lanmadaw',
            created_at: now,
            updated_at: now,
          },
          {
            id: 'ward-pyigyimyatshin',
            name: 'Pyi Gyi Myat Shin Ward',
            township_id: 'township-chanayethazan',
            created_at: now,
            updated_at: now,
          },
          {
            id: 'ward-haymamarlar',
            name: 'Hayma Marlar Ward',
            township_id: 'township-maharaundmyay',
            created_at: now,
            updated_at: now,
          },
        ])
        .onConflictDoNothing();

      // 2. Seed Users
      for (const u of INITIAL_USERS_SEED) {
        await db
          .insert(schema.pgSchema.users)
          .values({
            id: u.id,
            username: u.username,
            password: hashedPassword,
            role: u.role,
            region_id: u.region_id,
            created_at: now,
            updated_at: now,
          })
          .onConflictDoNothing();
      }
      this.logger.log(
        'Seeded 5 mock users (roles: sales, manager, admin, intake)',
      );

      // 3. Seed Price Books
      await db
        .insert(schema.pgSchema.price_books)
        .values([
          {
            id: 'pb-yangon',
            name: 'Yangon Retail Book',
            region_id: 'region-yangon',
            created_at: now,
            updated_at: now,
          },
          {
            id: 'pb-mandalay',
            name: 'Mandalay Wholesale Book',
            region_id: 'region-mandalay',
            created_at: now,
            updated_at: now,
          },
        ])
        .onConflictDoNothing();

      // 3.5. Seed Projects
      for (const p of INITIAL_PROJECTS_SEED) {
        await db
          .insert(schema.pgSchema.projects)
          .values({
            id: p.id,
            name: p.name,
            created_at: now,
            updated_at: now,
          })
          .onConflictDoNothing();
      }

      // Seed Brand Crocodile
      await db
        .insert(schema.pgSchema.brands)
        .values({
          id: 'brand-crocodile',
          name: 'Crocodile',
          created_at: now,
          updated_at: now,
        })
        .onConflictDoNothing();

      // 4. Seed items & stocks
      for (const item of INITIAL_ITEMS_SEED) {
        await db
          .insert(schema.pgSchema.items)
          .values({
            id: item.id,
            sku: item.sku,
            name: item.name,
            unit_price: item.unit_price,
            category: item.category,
            brand_id: item.brand_id || null,
            color: item.color,
            material_sub_type: item.material_sub_type,
            hardware_finish: item.hardware_finish,
            is_in_deficit: item.is_in_deficit,
            base_wholesale_price: item.base_wholesale_price,
            base_currency: item.base_currency,
            volume_discount_brackets: item.volume_discount_brackets,
            created_at: now,
            updated_at: now,
          })
          .onConflictDoNothing();

        await db
          .insert(schema.pgSchema.item_stocks)
          .values({
            id: `stock-${item.id}`,
            item_id: item.id,
            good_stock_count: item.quantity,
            wet_stock_count: 0,
            bad_stock_count: 0,
            pending_allocation_count: item.pendingAllocationCount || 0,
            created_at: now,
            updated_at: now,
          })
          .onConflictDoNothing();

        await db
          .insert(schema.pgSchema.price_book_items)
          .values({
            id: `pbi-y-${item.id}`,
            price_book_id: 'pb-yangon',
            item_id: item.id,
            price: item.unit_price,
            currency: 'MMK',
            created_at: now,
            updated_at: now,
          })
          .onConflictDoNothing();

        await db
          .insert(schema.pgSchema.price_book_items)
          .values({
            id: `pbi-m-${item.id}`,
            price_book_id: 'pb-mandalay',
            item_id: item.id,
            price: item.unit_price * 0.9,
            currency: 'MMK',
            created_at: now,
            updated_at: now,
          })
          .onConflictDoNothing();
      }

      for (const r of INITIAL_EXCHANGE_RATES_SEED) {
        await db
          .insert(schema.pgSchema.exchange_rates)
          .values({
            id: `rate-${r.from}-${r.to}`,
            from_currency: r.from,
            to_currency: r.to,
            rate: r.rate,
            updated_at: now,
          })
          .onConflictDoNothing();
      }

      await db
        .insert(schema.pgSchema.currency_exchange_rates)
        .values([
          {
            id: 'rate-usd',
            currency: 'USD',
            rate_to_kyat: 4200.0,
            pushed_at: now,
          },
          {
            id: 'rate-thb',
            currency: 'THB',
            rate_to_kyat: 115.0,
            pushed_at: now,
          },
        ])
        .onConflictDoNothing();

      for (const s of INITIAL_SHOPS_SEED) {
        await db
          .insert(schema.pgSchema.shops)
          .values({
            id: s.id,
            name: s.name,
            address: s.address,
            latitude: s.latitude,
            longitude: s.longitude,
            region_id: s.region_id,
            township_id: s.township_id,
            ward_id: s.ward_id,
            price_book_id: s.price_book_id,
            lifetime_value: s.ltv,
            sentiment_trend: s.trend,
            price_tier: 'Retailer',
            created_at: now,
            updated_at: now,
          })
          .onConflictDoNothing();

        await db
          .insert(schema.pgSchema.prediction_logs)
          .values({
            id: `pred-${s.id}`,
            shop_id: s.id,
            predicted_ltv: s.ltv * 1.1,
            churn_risk:
              s.trend === 'DECLINING'
                ? 0.82
                : s.trend === 'STABLE'
                  ? 0.35
                  : 0.08,
            stockout_risk: s.id === 'shop-1' || s.id === 'shop-3' ? 0.65 : 0.15,
            created_at: now,
            updated_at: now,
          })
          .onConflictDoNothing();

        await db
          .insert(schema.pgSchema.recommended_orders)
          .values({
            id: `rec-${s.id}-item-1`,
            shop_id: s.id,
            item_id: 'item-1',
            quantity: s.id === 'shop-1' ? 48 : 24,
            confidence: 0.89,
            created_at: now,
            updated_at: now,
          })
          .onConflictDoNothing();
      }

      await db
        .insert(schema.pgSchema.planned_routes)
        .values([
          {
            id: 'route-ko-min',
            rep_id: 'rep-1',
            date: new Date().toISOString().split('T')[0],
            shop_ids: JSON.stringify(['shop-1', 'shop-3']),
            created_at: now,
            updated_at: now,
          },
          {
            id: 'route-ko-hla',
            rep_id: 'rep-2',
            date: new Date().toISOString().split('T')[0],
            shop_ids: JSON.stringify(['shop-4', 'shop-5']),
            created_at: now,
            updated_at: now,
          },
        ])
        .onConflictDoNothing();

      for (const sc of INITIAL_REP_SCORES_SEED) {
        await db
          .insert(schema.pgSchema.rep_scores)
          .values({
            id: `score-${sc.repId}`,
            rep_id: sc.repId,
            points: sc.points,
            streak_days: sc.streakDays,
            badges: sc.badges,
            created_at: now,
            updated_at: now,
          })
          .onConflictDoNothing();
      }

      // 7. Seed Invoices & Payments (AR)
      await db
        .insert(schema.pgSchema.invoices)
        .values(buildInvoicesSeed(now))
        .onConflictDoNothing();

      await db
        .insert(schema.pgSchema.payments)
        .values(buildPaymentsSeed(now))
        .onConflictDoNothing();

      // 8. Seed Expected Inbounds (Transit forecast)
      await db
        .insert(schema.pgSchema.expected_inbounds)
        .values(buildExpectedInboundsSeed(now))
        .onConflictDoNothing();

      // 9. Seed Pending Inventory Updates (Intake approvals queue)
      await db
        .insert(schema.pgSchema.pending_inventory_updates)
        .values(buildPendingInventoryUpdatesSeed(now))
        .onConflictDoNothing();

      // 10. Seed Audit Events (Security/Compliance)
      await db
        .insert(schema.pgSchema.audit_events)
        .values(buildAuditEventsSeed(now))
        .onConflictDoNothing();

      // 11. Seed Mismatch Logs (HITL verification queue)
      await db
        .insert(schema.pgSchema.interaction_logs)
        .values(buildMismatchInteractionLogSeed(now))
        .onConflictDoNothing();

      await db
        .insert(schema.pgSchema.interaction_items)
        .values(buildMismatchInteractionItemSeed(now))
        .onConflictDoNothing();

      // 12. Seed failed queue jobs (DLQ monitor)
      await this.seedFailedQueueJobs();

      // Set up real-time invalidation triggers in PostgreSQL
      await this.configureInvalidationTriggers(db);

      this.logger.log('Seeded E2E dataset (Drizzle version) successfully');
    } catch (error: unknown) {
      const err = error as { stack?: string; message?: string };
      this.logger.error(
        'Failed to seed E2E dataset:',
        err.stack || err.message || error,
      );
    }
  }

  async runDeterministicSeeding(db: Db): Promise<void> {
    const now = Date.now();
    const hashedPassword = await bcrypt.hash(DEFAULT_SEED_PASSWORD, 10);

    const tables = [
      schema.pgSchema.payments,
      schema.pgSchema.invoices,
      schema.pgSchema.interaction_items,
      schema.pgSchema.interaction_logs,
      schema.pgSchema.contacts,
      schema.pgSchema.items,
      schema.pgSchema.shops,
      schema.pgSchema.wards,
      schema.pgSchema.townships,
      schema.pgSchema.regions,
      schema.pgSchema.daily_quotas,
      schema.pgSchema.item_stocks,
      schema.pgSchema.planned_routes,
      schema.pgSchema.prediction_logs,
      schema.pgSchema.recommended_orders,
      schema.pgSchema.price_books,
      schema.pgSchema.price_book_items,
      schema.pgSchema.exchange_rates,
      schema.pgSchema.rep_scores,
      schema.pgSchema.points_logs,
      schema.pgSchema.brands,
      schema.pgSchema.stock_locations,
      schema.pgSchema.stock_balances,
      schema.pgSchema.projects,
      schema.pgSchema.rep_kpis,
      schema.pgSchema.currency_exchange_rates,
      schema.pgSchema.competitor_insights,
      schema.pgSchema.pending_inventory_updates,
      schema.pgSchema.audit_events,
      schema.pgSchema.expected_inbounds,
      schema.pgSchema.users,
    ];

    for (const table of tables) {
      try {
        await db.delete(table);
      } catch (err: unknown) {
        const e = err as { message?: string };
        this.logger.warn(
          `Could not clear table during deterministic seed: ${e.message || err}`,
        );
      }
    }

    // 1. Seed Brands
    await db.insert(schema.pgSchema.brands).values([
      { id: 'brand-shera', name: 'Shera', created_at: now, updated_at: now },
      {
        id: 'brand-crocodile',
        name: 'Crocodile',
        created_at: now,
        updated_at: now,
      },
      { id: 'brand-karat', name: 'Karat', created_at: now, updated_at: now },
    ]);

    // 2. Seed Regions, Townships, Wards
    await db.insert(schema.pgSchema.regions).values([
      {
        id: 'region-yangon',
        name: 'Yangon Region',
        division: 'Yangon Division',
        created_at: now,
        updated_at: now,
      },
    ]);

    await db.insert(schema.pgSchema.townships).values([
      {
        id: 'township-lanmadaw',
        name: 'Lanmadaw Township',
        region_id: 'region-yangon',
        created_at: now,
        updated_at: now,
      },
      {
        id: 'township-northokkalar',
        name: 'North Okkalar Township',
        region_id: 'region-yangon',
        created_at: now,
        updated_at: now,
      },
    ]);

    await db.insert(schema.pgSchema.wards).values([
      {
        id: 'ward-ward1',
        name: 'Ward 1',
        township_id: 'township-lanmadaw',
        created_at: now,
        updated_at: now,
      },
      {
        id: 'ward-northokkalar-ward',
        name: 'North Okkalar Ward',
        township_id: 'township-northokkalar',
        created_at: now,
        updated_at: now,
      },
    ]);

    // 3. Seed Users (Reps & Managers)
    for (const u of DETERMINISTIC_USERS_SEED) {
      await db.insert(schema.pgSchema.users).values({
        id: u.id,
        username: u.username,
        password: hashedPassword,
        role: u.role,
        region_id: u.region_id,
        created_at: now,
        updated_at: now,
      });
    }

    // 4. Seed Price Books
    await db.insert(schema.pgSchema.price_books).values([
      {
        id: 'pb-yangon',
        name: 'Yangon Retail Book',
        region_id: 'region-yangon',
        created_at: now,
        updated_at: now,
      },
    ]);

    // 5. Seed Products (items)
    for (const item of DETERMINISTIC_ITEMS_SEED) {
      await db.insert(schema.pgSchema.items).values({
        id: item.id,
        sku: item.sku,
        name: item.name,
        unit_price: item.unit_price,
        category: item.category,
        brand_id: item.brand_id,
        color: item.color || null,
        weight: item.weight || null,
        finish_code: item.finish_code || null,
        dimensions: item.dimensions || null,
        created_at: now,
        updated_at: now,
      });

      await db.insert(schema.pgSchema.item_stocks).values({
        id: `stock-${item.id}`,
        item_id: item.id,
        good_stock_count: item.good,
        wet_stock_count: item.wet,
        bad_stock_count: item.bad,
        pending_allocation_count: item.id === 'item-7' ? 1756 : 0,
        created_at: now,
        updated_at: now,
      });

      await db.insert(schema.pgSchema.price_book_items).values({
        id: `pbi-y-${item.id}`,
        price_book_id: 'pb-yangon',
        item_id: item.id,
        price: item.unit_price,
        currency: 'MMK',
        created_at: now,
        updated_at: now,
      });
    }

    // 6. Seed Shops
    for (const s of DETERMINISTIC_SHOPS_SEED) {
      await db.insert(schema.pgSchema.shops).values({
        id: s.id,
        name: s.name,
        address: s.address,
        latitude: s.latitude,
        longitude: s.longitude,
        region_id: s.region_id,
        price_book_id: s.price_book_id,
        credit_limit_mmk: s.credit_limit_mmk,
        lifetime_value: 0,
        sentiment_trend: 'STABLE',
        price_tier: 'Retailer',
        assigned_rep_id: s.assigned_rep_id,
        created_at: now,
        updated_at: now,
      });
    }

    // 7. Seed Invoices & Payments (AR)
    await db.insert(schema.pgSchema.invoices).values(buildInvoicesSeed(now));

    await db.insert(schema.pgSchema.payments).values(buildPaymentsSeed(now));

    // 8. Seed Expected Inbounds (Transit forecast)
    await db
      .insert(schema.pgSchema.expected_inbounds)
      .values(buildExpectedInboundsSeed(now));

    // 9. Seed Pending Inventory Updates (Intake approvals queue)
    await db
      .insert(schema.pgSchema.pending_inventory_updates)
      .values(buildPendingInventoryUpdatesSeed(now));

    // 10. Seed Audit Events (Security/Compliance)
    await db
      .insert(schema.pgSchema.audit_events)
      .values(buildAuditEventsSeed(now));

    // 11. Seed Mismatch Logs (HITL verification queue)
    await db
      .insert(schema.pgSchema.interaction_logs)
      .values(buildMismatchInteractionLogSeed(now));

    await db
      .insert(schema.pgSchema.interaction_items)
      .values(buildMismatchInteractionItemSeed(now));

    // 12. Seed failed queue jobs (DLQ monitor)
    await this.seedFailedQueueJobs();

    this.logger.log('Deterministic seeding completed successfully');
  }

  private async seedFailedQueueJobs(): Promise<void> {
    try {
      const queue = new Queue(QUEUE_NAME, {
        connection: { url: env.REDIS_URL },
      });
      const failedJobs = await queue.getFailed(0, 10);
      if (failedJobs.length === 0) {
        await queue.add('corrupted-transaction', {
          reason: 'Signature mismatch on crypt-frame',
          payload: {
            transactionId: 'tx-err-999',
            amount: 15000000,
            repId: 'rep-1',
          },
        });
        await queue.add('process-screenshot', {
          interactionLogId: 'log-err-888',
          filePath: '/nonexistent/screenshot.png',
          reason: 'File not found on disk',
        });
      }
      await queue.close();
    } catch (err: unknown) {
      const e = err as { message?: string };
      this.logger.warn(
        `Could not seed failed jobs to BullMQ: ${e.message || err}`,
      );
    }
  }

  private async configureInvalidationTriggers(db: Db): Promise<void> {
    try {
      await db.execute(sql`
        CREATE OR REPLACE FUNCTION notify_table_invalidation()
        RETURNS trigger AS $$
        BEGIN
          PERFORM pg_notify('live_invalidations', json_build_object('table', TG_TABLE_NAME)::text);
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `);

      await db.execute(sql`
        DROP TRIGGER IF EXISTS item_stocks_invalidation_trigger ON item_stocks;
      `);
      await db.execute(sql`
        CREATE TRIGGER item_stocks_invalidation_trigger
        AFTER INSERT OR UPDATE OR DELETE ON item_stocks
        FOR EACH ROW EXECUTE FUNCTION notify_table_invalidation();
      `);

      await db.execute(sql`
        DROP TRIGGER IF EXISTS exchange_rates_invalidation_trigger ON exchange_rates;
      `);
      await db.execute(sql`
        CREATE TRIGGER exchange_rates_invalidation_trigger
        AFTER INSERT OR UPDATE OR DELETE ON exchange_rates
        FOR EACH ROW EXECUTE FUNCTION notify_table_invalidation();
      `);
      this.logger.log(
        'Database notification triggers configured successfully.',
      );
    } catch (triggerErr: unknown) {
      const message =
        triggerErr instanceof Error ? triggerErr.message : String(triggerErr);
      this.logger.warn(`Failed to configure database triggers: ${message}`);
    }
  }
}
