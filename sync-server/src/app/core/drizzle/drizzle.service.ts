import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '@burma-inventory/shared-types';
import * as bcrypt from 'bcryptjs';
import { sql } from 'drizzle-orm';
import { Queue } from 'bullmq';
import { env } from '../../../env';

@Injectable()
export class DrizzleService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DrizzleService.name);
  public db!: NodePgDatabase<typeof schema.pgSchema>;
  public readDb!: NodePgDatabase<typeof schema.pgSchema>;
  private pool!: Pool;
  private readPool!: Pool;

  constructor() {
    const url = process.env['DATABASE_URL'];
    if (!url) throw new Error('DATABASE_URL is not defined');

    this.pool = new Pool({ connectionString: url });
    this.db = drizzle(this.pool, { schema: schema.pgSchema });

    const replicaUrl = process.env['DATABASE_REPLICA_URL'] || url;
    this.readPool = new Pool({ connectionString: replicaUrl });
    this.readDb = drizzle(this.readPool, { schema: schema.pgSchema });
  }

  async onModuleInit() {
    this.logger.log('Connected to PostgreSQL via Drizzle (Read-Write split)');
    await this.seed();
  }

  async onModuleDestroy() {
    await Promise.all([this.pool.end(), this.readPool.end()]);
    this.logger.log('Disconnected from PostgreSQL (Both pools ended)');
  }

  private async seed() {
    try {
      const hashedPassword = await bcrypt.hash('changeme-rep-default', 10);
      const now = Date.now();

      // 1. Seed Regions
      await this.db
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
      await this.db
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

      await this.db
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
      const usersData = [
        {
          id: 'rep-1',
          username: 'rep1',
          role: 'sales',
          region_id: 'region-yangon',
        },
        {
          id: 'rep-2',
          username: 'rep2',
          role: 'sales',
          region_id: 'region-mandalay',
        },
        { id: 'rep-3', username: 'rep3', role: 'manager', region_id: null },
        { id: 'rep-4', username: 'rep4', role: 'admin', region_id: null },
        { id: 'rep-5', username: 'rep5', role: 'intake', region_id: null },
      ];

      for (const u of usersData) {
        await this.db
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
      await this.db
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
      const projectsData = [
        { id: 'project-1', name: 'Galaxy Tower-3' },
        { id: 'project-2', name: 'Zaw Residence' },
        { id: 'project-3', name: 'Grand Plaza Project' },
      ];

      for (const p of projectsData) {
        await this.db
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
      await this.db
        .insert(schema.pgSchema.brands)
        .values({
          id: 'brand-crocodile',
          name: 'Crocodile',
          created_at: now,
          updated_at: now,
        })
        .onConflictDoNothing();

      // 4. Seed items & stocks
      const itemsData = [
        {
          id: 'item-1',
          sku: 'SKU-SH-6MM',
          name: 'Shera Fiber Cement Board 6mm',
          unit_price: 15000.0,
          category: 'Fiber Cement',
          quantity: 150,
          color: 'Off-White',
          material_sub_type: 'MR',
          hardware_finish: null,
          is_in_deficit: true,
          base_wholesale_price: 3.2,
          base_currency: 'USD',
          volume_discount_brackets:
            '[{"quantity": 10, "discount_percent": 5}, {"quantity": 50, "discount_percent": 10}]',
        },
        {
          id: 'item-2',
          sku: 'SKU-GT-PVC-12',
          name: 'Gator PVC Pipe 1/2 inch',
          unit_price: 4500.0,
          category: 'Plumbing',
          quantity: 300,
          color: 'Blue',
          material_sub_type: 'RE',
          hardware_finish: null,
          is_in_deficit: false,
          base_wholesale_price: 35.0,
          base_currency: 'THB',
          volume_discount_brackets:
            '[{"quantity": 100, "discount_percent": 5}]',
        },
        {
          id: 'item-3',
          sku: 'SKU-KR-WC',
          name: 'Karat Ceramic Water Closet',
          unit_price: 180000.0,
          category: 'Sanitaryware',
          quantity: 500,
          color: 'White',
          material_sub_type: null,
          hardware_finish: 'CP',
          is_in_deficit: false,
          base_wholesale_price: null,
          base_currency: null,
          volume_discount_brackets: null,
        },
        {
          id: 'item-4',
          sku: 'SKU-VR-FC',
          name: 'VRH Stainless steel Faucet',
          unit_price: 35000.0,
          category: 'Fittings',
          quantity: 200,
          color: 'Silver',
          material_sub_type: null,
          hardware_finish: 'BL',
          is_in_deficit: false,
          base_wholesale_price: null,
          base_currency: null,
          volume_discount_brackets: null,
        },
        {
          id: 'item-5',
          sku: 'SKU-SCG-8MM',
          name: 'SCG Smart Board 8mm',
          unit_price: 22000.0,
          category: 'Fiber Cement',
          quantity: 120,
          color: 'Grey',
          material_sub_type: 'MR',
          hardware_finish: null,
          is_in_deficit: false,
          base_wholesale_price: null,
          base_currency: null,
          volume_discount_brackets: null,
        },
        {
          id: 'item-6',
          sku: 'SKU-KN-GP-9MM',
          name: 'Knauf Gypsum Board 9mm',
          unit_price: 12500.0,
          category: 'Drywall',
          quantity: 180,
          color: 'White',
          material_sub_type: 'RE',
          hardware_finish: null,
          is_in_deficit: false,
          base_wholesale_price: null,
          base_currency: null,
          volume_discount_brackets: null,
        },
        {
          id: 'item-7',
          sku: 'SKU-CR-GP-GROUT',
          name: 'Crocodile GP Grout',
          unit_price: 18000.0,
          category: 'Grout',
          brand_id: 'brand-crocodile',
          quantity: 0,
          pendingAllocationCount: 1756,
          color: 'Grey',
          material_sub_type: null,
          hardware_finish: null,
          is_in_deficit: false,
          base_wholesale_price: null,
          base_currency: null,
          volume_discount_brackets: null,
        },
      ];

      for (const item of itemsData) {
        await this.db
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

        await this.db
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

        await this.db
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

        await this.db
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

      const rates = [
        { from: 'USD', to: 'MMK', rate: 2100.0 },
        { from: 'THB', to: 'MMK', rate: 58.5 },
      ];
      for (const r of rates) {
        await this.db
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

      await this.db
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

      const shopsData = [
        {
          id: 'shop-1',
          name: 'City Mart Junction City',
          address: 'Bogyoke Aung San Rd, Yangon',
          latitude: 16.7794,
          longitude: 96.1518,
          region_id: 'region-yangon',
          township_id: 'township-lanmadaw',
          ward_id: 'ward-ward1',
          price_book_id: 'pb-yangon',
          ltv: 1250000.0,
          trend: 'IMPROVING',
        },
        {
          id: 'shop-2',
          name: 'Ruby Supermarket Mandalay',
          address: '78th St, Mandalay',
          latitude: 21.9754,
          longitude: 96.0838,
          region_id: 'region-mandalay',
          township_id: 'township-chanayethazan',
          ward_id: 'ward-pyigyimyatshin',
          price_book_id: 'pb-mandalay',
          ltv: 980000.0,
          trend: 'STABLE',
        },
        {
          id: 'shop-3',
          name: 'Kantharyar Shopping Centre',
          address: 'U Aung Myat St, Yangon',
          latitude: 16.7932,
          longitude: 96.1664,
          region_id: 'region-yangon',
          township_id: 'township-lanmadaw',
          ward_id: 'ward-ward2',
          price_book_id: 'pb-yangon',
          ltv: 450000.0,
          trend: 'DECLINING',
        },
        {
          id: 'shop-4',
          name: 'Mandalay Station Store',
          address: 'Railway Station Ground, Mandalay',
          latitude: 21.9685,
          longitude: 96.0852,
          region_id: 'region-mandalay',
          township_id: 'township-maharaundmyay',
          ward_id: 'ward-haymamarlar',
          price_book_id: 'pb-mandalay',
          ltv: 150000.0,
          trend: 'IMPROVING',
        },
        {
          id: 'shop-5',
          name: 'Mandalay Royal Palace Shop',
          address: '73rd St, Mandalay',
          latitude: 21.9902,
          longitude: 96.0965,
          region_id: 'region-mandalay',
          township_id: 'township-chanayethazan',
          ward_id: 'ward-pyigyimyatshin',
          price_book_id: 'pb-mandalay',
          ltv: 250000.0,
          trend: 'STABLE',
        },
      ];

      for (const s of shopsData) {
        await this.db
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

        await this.db
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

        await this.db
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

      await this.db
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

      const scores = [
        {
          repId: 'rep-1',
          points: 450,
          streakDays: 5,
          badges: JSON.stringify(['Top Seller', 'Early Bird']),
        },
        {
          repId: 'rep-2',
          points: 380,
          streakDays: 3,
          badges: JSON.stringify(['Road Warrior']),
        },
        {
          repId: 'rep-3',
          points: 0,
          streakDays: 0,
          badges: JSON.stringify([]),
        },
        {
          repId: 'rep-4',
          points: 1500,
          streakDays: 12,
          badges: JSON.stringify(['Admin Champion']),
        },
        {
          repId: 'rep-5',
          points: 120,
          streakDays: 2,
          badges: JSON.stringify(['Master Organizer']),
        },
      ];

      for (const sc of scores) {
        await this.db
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
      const dueOverdue = now - 45 * 24 * 3600 * 1000;
      const duePending = now + 15 * 24 * 3600 * 1000;
      const duePartiallyPaid = now - 5 * 24 * 3600 * 1000;
      const duePaid = now - 20 * 24 * 3600 * 1000;

      await this.db
        .insert(schema.pgSchema.invoices)
        .values([
          {
            id: 'inv-1',
            shop_id: 'shop-1',
            interaction_log_id: 'log-r1-d0-1',
            amount: 1200000.0,
            due_date: dueOverdue,
            grace_period_days: 7,
            state: 'OVERDUE',
            created_at: now - 50 * 24 * 3600 * 1000,
            updated_at: now,
          },
          {
            id: 'inv-2',
            shop_id: 'shop-1',
            interaction_log_id: 'log-r1-d1-1',
            amount: 850000.0,
            due_date: duePending,
            grace_period_days: 7,
            state: 'PENDING',
            created_at: now - 10 * 24 * 3600 * 1000,
            updated_at: now,
          },
          {
            id: 'inv-3',
            shop_id: 'shop-1',
            interaction_log_id: 'log-r1-d1-7',
            amount: 500000.0,
            due_date: duePartiallyPaid,
            grace_period_days: 7,
            state: 'PARTIALLY_PAID',
            created_at: now - 15 * 24 * 3600 * 1000,
            updated_at: now,
          },
          {
            id: 'inv-4',
            shop_id: 'shop-3',
            interaction_log_id: 'log-r1-d0-2',
            amount: 2500000.0,
            due_date: now + 10 * 24 * 3600 * 1000,
            grace_period_days: 7,
            state: 'PENDING',
            created_at: now - 5 * 24 * 3600 * 1000,
            updated_at: now,
          },
          {
            id: 'inv-5',
            shop_id: 'shop-3',
            interaction_log_id: 'log-r1-d1-2',
            amount: 1800000.0,
            due_date: duePaid,
            grace_period_days: 7,
            state: 'PAID',
            created_at: now - 25 * 24 * 3600 * 1000,
            updated_at: now,
          },
        ])
        .onConflictDoNothing();

      await this.db
        .insert(schema.pgSchema.payments)
        .values([
          {
            id: 'pay-1',
            invoice_id: 'inv-3',
            amount: 200000.0,
            payment_date: now - 6 * 24 * 3600 * 1000,
            transaction_ref: 'TXN-MMK-302198',
            screenshot_url: '/api/sync/uploads/mock_pay_1.png',
            reconciled_by: 'rep-4',
            created_at: now - 6 * 24 * 3600 * 1000,
            updated_at: now,
          },
          {
            id: 'pay-2',
            invoice_id: 'inv-5',
            amount: 1800000.0,
            payment_date: now - 20 * 24 * 3600 * 1000,
            transaction_ref: 'TXN-MMK-109283',
            screenshot_url: '/api/sync/uploads/mock_pay_2.png',
            reconciled_by: 'rep-4',
            created_at: now - 20 * 24 * 3600 * 1000,
            updated_at: now,
          },
        ])
        .onConflictDoNothing();

      // 8. Seed Expected Inbounds (Transit forecast)
      await this.db
        .insert(schema.pgSchema.expected_inbounds)
        .values([
          {
            id: 'inbound-1',
            sku: 'SKU-SH-CEILING-2X2',
            expected_quantity: 500,
            origin: 'Thailand',
            estimated_arrival_date: new Date(now + 2 * 24 * 3600 * 1000)
              .toISOString()
              .split('T')[0],
            created_at: now,
            updated_at: now,
          },
          {
            id: 'inbound-2',
            sku: 'SKU-CR-GP-GROUT-20KG',
            expected_quantity: 1000,
            origin: 'Thailand',
            estimated_arrival_date: new Date(now + 5 * 24 * 3600 * 1000)
              .toISOString()
              .split('T')[0],
            created_at: now,
            updated_at: now,
          },
          {
            id: 'inbound-3',
            sku: 'SKU-K-15814X-8-CP',
            expected_quantity: 250,
            origin: 'Thailand',
            estimated_arrival_date: new Date(now + 10 * 24 * 3600 * 1000)
              .toISOString()
              .split('T')[0],
            created_at: now,
            updated_at: now,
          },
        ])
        .onConflictDoNothing();

      // 9. Seed Pending Inventory Updates (Intake approvals queue)
      await this.db
        .insert(schema.pgSchema.pending_inventory_updates)
        .values([
          {
            id: 'pend-up-1',
            type: 'STOCK_ADJUSTMENT',
            item_id: 'item-1',
            location_id: 'loc-yangon-wh',
            quantity_delta: 150,
            submitted_by: 'manwesoe',
            status: 'PENDING',
            created_at: now,
            updated_at: now,
          },
          {
            id: 'pend-up-2',
            type: 'STOCK_ADJUSTMENT',
            item_id: 'item-7',
            location_id: 'loc-yangon-wh',
            quantity_delta: -50,
            submitted_by: 'khaingyeewin',
            status: 'PENDING',
            created_at: now,
            updated_at: now,
          },
          {
            id: 'pend-up-3',
            type: 'NEW_SKU',
            item_id: null,
            location_id: 'loc-yangon-wh',
            quantity_delta: 300,
            sku: 'SKU-GT-PVC-90',
            name: 'Gator PVC Pipe 90mm',
            unit_price: 12500,
            category: 'Plumbing',
            submitted_by: 'rep-1',
            status: 'PENDING',
            created_at: now,
            updated_at: now,
          },
        ])
        .onConflictDoNothing();

      // 10. Seed Audit Events (Security/Compliance)
      await this.db
        .insert(schema.pgSchema.audit_events)
        .values([
          {
            event_id: 'evt-1',
            trace_id: 'tr-001',
            actor_id: 'rep-1',
            device_id: 'dev-1',
            entity_type: 'ORDER',
            action: 'OVERRIDE',
            previous_state: { unit_price_at_sale: 47000 },
            new_state: { unit_price_at_sale: 40000 },
            gps_coordinates: '16.9123, 96.1645',
            hash: 'mock-hash-1',
            status: 'VALID',
            created_at: now - 3 * 3600 * 1000,
            shop_id: 'shop-1',
            executed_by_id: 'rep-1',
            salesperson_id: 'rep-1',
            approved_by_id: 'rep-3',
          },
          {
            event_id: 'evt-2',
            trace_id: 'tr-002',
            actor_id: 'rep-3',
            device_id: 'dev-1',
            entity_type: 'SHOP',
            action: 'UPDATE',
            previous_state: { credit_limit_mmk: 10000000 },
            new_state: { credit_limit_mmk: 12000000 },
            gps_coordinates: '16.9234, 96.1756',
            hash: 'mock-hash-2',
            status: 'VALID',
            created_at: now - 1 * 3600 * 1000,
            shop_id: 'shop-3',
            executed_by_id: 'rep-3',
            salesperson_id: 'rep-3',
            approved_by_id: 'rep-4',
          },
        ])
        .onConflictDoNothing();

      // 11. Seed Mismatch Logs (HITL verification queue)
      await this.db
        .insert(schema.pgSchema.interaction_logs)
        .values({
          id: 'log-mismatch-1',
          shop_id: 'shop-1',
          rep_id: 'viber_bot',
          type: 'VIBER',
          commercial_status: 'ORDER_PLACED',
          notes:
            'Viber order mismatch detected. OCR parsed 10 bags of GP Grout, but image shows 20 bags.',
          ai_verification_status: 'MISMATCH',
          ai_verification_notes: 'OCR mismatch: quantity check failed.',
          viber_screenshot_url:
            '/api/sync/uploads/mock_mismatch_screenshot.png',
          created_at_local: now - 2 * 3600 * 1000,
          device_id: 'viber_bot',
          created_at: now - 2 * 3600 * 1000,
          updated_at: now,
        })
        .onConflictDoNothing();

      await this.db
        .insert(schema.pgSchema.interaction_items)
        .values({
          id: 'ii-mismatch-1',
          interaction_log_id: 'log-mismatch-1',
          item_id: 'item-7',
          quantity: 10,
          unit_price_at_sale: 18000,
          interest_level: 'HIGH',
          selected_currency: 'MMK',
          selected_unit: 'PCS',
          stock_condition: 'GOOD',
          fulfillment_status: 'PENDING_FULFILLMENT',
          compliance_status: 'APPROVED',
          created_at: now - 2 * 3600 * 1000,
          updated_at: now,
        })
        .onConflictDoNothing();

      // 12. Seed failed queue jobs (DLQ monitor)
      try {
        const queue = new Queue('ai-tasks', {
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
      } catch (err: $Any) {
        this.logger.warn(
          `Could not seed failed jobs to BullMQ: ${err.message || err}`,
        );
      }

      // Set up real-time invalidation triggers in PostgreSQL
      try {
        await this.db.execute(sql`
          CREATE OR REPLACE FUNCTION notify_table_invalidation()
          RETURNS trigger AS $$
          BEGIN
            PERFORM pg_notify('live_invalidations', json_build_object('table', TG_TABLE_NAME)::text);
            RETURN NEW;
          END;
          $$ LANGUAGE plpgsql;
        `);

        await this.db.execute(sql`
          DROP TRIGGER IF EXISTS item_stocks_invalidation_trigger ON item_stocks;
        `);
        await this.db.execute(sql`
          CREATE TRIGGER item_stocks_invalidation_trigger
          AFTER INSERT OR UPDATE OR DELETE ON item_stocks
          FOR EACH ROW EXECUTE FUNCTION notify_table_invalidation();
        `);

        await this.db.execute(sql`
          DROP TRIGGER IF EXISTS exchange_rates_invalidation_trigger ON exchange_rates;
        `);
        await this.db.execute(sql`
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

      this.logger.log('Seeded E2E dataset (Drizzle version) successfully');
    } catch (error: $Any) {
      this.logger.error(
        'Failed to seed E2E dataset:',
        error.stack || error.message || error,
      );
    }
  }

  async runDeterministicSeeding() {
    const now = Date.now();
    const hashedPassword = await bcrypt.hash('changeme-rep-default', 10);

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
        await this.db.delete(table);
      } catch (err: $Any) {
        this.logger.warn(
          `Could not clear table during deterministic seed: ${err.message || err}`,
        );
      }
    }

    // 1. Seed Brands
    await this.db.insert(schema.pgSchema.brands).values([
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
    await this.db.insert(schema.pgSchema.regions).values([
      {
        id: 'region-yangon',
        name: 'Yangon Region',
        division: 'Yangon Division',
        created_at: now,
        updated_at: now,
      },
    ]);

    await this.db.insert(schema.pgSchema.townships).values([
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

    await this.db.insert(schema.pgSchema.wards).values([
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
    const usersData = [
      {
        id: 'rep-1',
        username: 'wintthandar',
        role: 'sales',
        region_id: 'region-yangon',
      },
      {
        id: 'rep-2',
        username: 'yeyint',
        role: 'sales',
        region_id: 'region-yangon',
      },
      {
        id: 'rep-3',
        username: 'khaingyeewin',
        role: 'sales',
        region_id: 'region-yangon',
      },
      { id: 'rep-4', username: 'urobin', role: 'manager', region_id: null },
      { id: 'rep-5', username: 'manwesoe', role: 'manager', region_id: null },
    ];

    for (const u of usersData) {
      await this.db.insert(schema.pgSchema.users).values({
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
    await this.db.insert(schema.pgSchema.price_books).values([
      {
        id: 'pb-yangon',
        name: 'Yangon Retail Book',
        region_id: 'region-yangon',
        created_at: now,
        updated_at: now,
      },
    ]);

    // 5. Seed Products (items)
    const itemsData = [
      {
        id: 'item-7',
        sku: 'SKU-CR-GP-GROUT-20KG',
        name: 'Crocodile GP Grout (Grey), 20Kg',
        unit_price: 18000,
        category: 'Grout',
        brand_id: 'brand-crocodile',
        color: 'Grey',
        weight: '20kg',
        good: -1756,
        wet: 0,
        bad: 498,
      },
      {
        id: 'item-1',
        sku: 'SKU-SH-CEILING-2X2',
        name: 'Shera Ceiling Board 2x2 (0.35x61x61)',
        unit_price: 47000,
        category: 'Fiber Cement',
        brand_id: 'brand-shera',
        dimensions: '2x2 (0.35x61x61)',
        good: 94765,
        wet: 16137,
        bad: 7060,
      },
      {
        id: 'item-3',
        sku: 'SKU-K-15814X-8-CP',
        name: 'K-15814X-8-CP CAPRI Kitchen Faucet',
        unit_price: 35000,
        category: 'Fittings',
        brand_id: 'brand-karat',
        finish_code: 'CP',
        good: 100,
        wet: 0,
        bad: 0,
      },
    ];

    for (const item of itemsData) {
      await this.db.insert(schema.pgSchema.items).values({
        id: item.id,
        sku: item.sku,
        name: item.name,
        unit_price: item.unit_price,
        category: item.category,
        brand_id: item.brand_id,
        color: (item as $Any).color || null,
        weight: (item as $Any).weight || null,
        finish_code: (item as $Any).finish_code || null,
        dimensions: (item as $Any).dimensions || null,
        created_at: now,
        updated_at: now,
      });

      await this.db.insert(schema.pgSchema.item_stocks).values({
        id: `stock-${item.id}`,
        item_id: item.id,
        good_stock_count: item.good,
        wet_stock_count: item.wet,
        bad_stock_count: item.bad,
        pending_allocation_count: item.id === 'item-7' ? 1756 : 0,
        created_at: now,
        updated_at: now,
      });

      await this.db.insert(schema.pgSchema.price_book_items).values({
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
    const shopsData = [
      {
        id: 'shop-1',
        name: 'Soe Moe Khaing (North Okkalar)',
        address: 'North Okkalar, Yangon',
        latitude: 16.9123,
        longitude: 96.1645,
        region_id: 'region-yangon',
        credit_limit_mmk: 5000000,
        price_book_id: 'pb-yangon',
        assigned_rep_id: 'rep-3',
      },
      {
        id: 'shop-2',
        name: 'Taw Win (South Dagon)',
        address: 'South Dagon, Yangon',
        latitude: 16.8543,
        longitude: 96.2134,
        region_id: 'region-yangon',
        credit_limit_mmk: 2500000,
        price_book_id: 'pb-yangon',
        assigned_rep_id: 'rep-1',
      },
      {
        id: 'shop-3',
        name: 'Thingaha (North Okkalar)',
        address: 'North Okkalar, Yangon',
        latitude: 16.9234,
        longitude: 96.1756,
        region_id: 'region-yangon',
        credit_limit_mmk: 10000000,
        price_book_id: 'pb-yangon',
        assigned_rep_id: 'rep-3',
      },
    ];

    for (const s of shopsData) {
      await this.db.insert(schema.pgSchema.shops).values({
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
    const dueOverdue = now - 45 * 24 * 3600 * 1000;
    const duePending = now + 15 * 24 * 3600 * 1000;
    const duePartiallyPaid = now - 5 * 24 * 3600 * 1000;
    const duePaid = now - 20 * 24 * 3600 * 1000;

    await this.db.insert(schema.pgSchema.invoices).values([
      {
        id: 'inv-1',
        shop_id: 'shop-1',
        interaction_log_id: 'log-r1-d0-1',
        amount: 1200000.0,
        due_date: dueOverdue,
        grace_period_days: 7,
        state: 'OVERDUE',
        created_at: now - 50 * 24 * 3600 * 1000,
        updated_at: now,
      },
      {
        id: 'inv-2',
        shop_id: 'shop-1',
        interaction_log_id: 'log-r1-d1-1',
        amount: 850000.0,
        due_date: duePending,
        grace_period_days: 7,
        state: 'PENDING',
        created_at: now - 10 * 24 * 3600 * 1000,
        updated_at: now,
      },
      {
        id: 'inv-3',
        shop_id: 'shop-1',
        interaction_log_id: 'log-r1-d1-7',
        amount: 500000.0,
        due_date: duePartiallyPaid,
        grace_period_days: 7,
        state: 'PARTIALLY_PAID',
        created_at: now - 15 * 24 * 3600 * 1000,
        updated_at: now,
      },
      {
        id: 'inv-4',
        shop_id: 'shop-3',
        interaction_log_id: 'log-r1-d0-2',
        amount: 2500000.0,
        due_date: now + 10 * 24 * 3600 * 1000,
        grace_period_days: 7,
        state: 'PENDING',
        created_at: now - 5 * 24 * 3600 * 1000,
        updated_at: now,
      },
      {
        id: 'inv-5',
        shop_id: 'shop-3',
        interaction_log_id: 'log-r1-d1-2',
        amount: 1800000.0,
        due_date: duePaid,
        grace_period_days: 7,
        state: 'PAID',
        created_at: now - 25 * 24 * 3600 * 1000,
        updated_at: now,
      },
    ]);

    await this.db.insert(schema.pgSchema.payments).values([
      {
        id: 'pay-1',
        invoice_id: 'inv-3',
        amount: 200000.0,
        payment_date: now - 6 * 24 * 3600 * 1000,
        transaction_ref: 'TXN-MMK-302198',
        screenshot_url: '/api/sync/uploads/mock_pay_1.png',
        reconciled_by: 'rep-4',
        created_at: now - 6 * 24 * 3600 * 1000,
        updated_at: now,
      },
      {
        id: 'pay-2',
        invoice_id: 'inv-5',
        amount: 1800000.0,
        payment_date: now - 20 * 24 * 3600 * 1000,
        transaction_ref: 'TXN-MMK-109283',
        screenshot_url: '/api/sync/uploads/mock_pay_2.png',
        reconciled_by: 'rep-4',
        created_at: now - 20 * 24 * 3600 * 1000,
        updated_at: now,
      },
    ]);

    // 8. Seed Expected Inbounds (Transit forecast)
    await this.db.insert(schema.pgSchema.expected_inbounds).values([
      {
        id: 'inbound-1',
        sku: 'SKU-SH-CEILING-2X2',
        expected_quantity: 500,
        origin: 'Thailand',
        estimated_arrival_date: new Date(now + 2 * 24 * 3600 * 1000)
          .toISOString()
          .split('T')[0],
        created_at: now,
        updated_at: now,
      },
      {
        id: 'inbound-2',
        sku: 'SKU-CR-GP-GROUT-20KG',
        expected_quantity: 1000,
        origin: 'Thailand',
        estimated_arrival_date: new Date(now + 5 * 24 * 3600 * 1000)
          .toISOString()
          .split('T')[0],
        created_at: now,
        updated_at: now,
      },
      {
        id: 'inbound-3',
        sku: 'SKU-K-15814X-8-CP',
        expected_quantity: 250,
        origin: 'Thailand',
        estimated_arrival_date: new Date(now + 10 * 24 * 3600 * 1000)
          .toISOString()
          .split('T')[0],
        created_at: now,
        updated_at: now,
      },
    ]);

    // 9. Seed Pending Inventory Updates (Intake approvals queue)
    await this.db.insert(schema.pgSchema.pending_inventory_updates).values([
      {
        id: 'pend-up-1',
        type: 'STOCK_ADJUSTMENT',
        item_id: 'item-1',
        location_id: 'loc-yangon-wh',
        quantity_delta: 150,
        submitted_by: 'manwesoe',
        status: 'PENDING',
        created_at: now,
        updated_at: now,
      },
      {
        id: 'pend-up-2',
        type: 'STOCK_ADJUSTMENT',
        item_id: 'item-7',
        location_id: 'loc-yangon-wh',
        quantity_delta: -50,
        submitted_by: 'khaingyeewin',
        status: 'PENDING',
        created_at: now,
        updated_at: now,
      },
      {
        id: 'pend-up-3',
        type: 'NEW_SKU',
        item_id: null,
        location_id: 'loc-yangon-wh',
        quantity_delta: 300,
        sku: 'SKU-GT-PVC-90',
        name: 'Gator PVC Pipe 90mm',
        unit_price: 12500,
        category: 'Plumbing',
        submitted_by: 'rep-1',
        status: 'PENDING',
        created_at: now,
        updated_at: now,
      },
    ]);

    // 10. Seed Audit Events (Security/Compliance)
    await this.db.insert(schema.pgSchema.audit_events).values([
      {
        event_id: 'evt-1',
        trace_id: 'tr-001',
        actor_id: 'rep-1',
        device_id: 'dev-1',
        entity_type: 'ORDER',
        action: 'OVERRIDE',
        previous_state: { unit_price_at_sale: 47000 },
        new_state: { unit_price_at_sale: 40000 },
        gps_coordinates: '16.9123, 96.1645',
        hash: 'mock-hash-1',
        status: 'VALID',
        created_at: now - 3 * 3600 * 1000,
        shop_id: 'shop-1',
        executed_by_id: 'rep-1',
        salesperson_id: 'rep-1',
        approved_by_id: 'rep-3',
      },
      {
        event_id: 'evt-2',
        trace_id: 'tr-002',
        actor_id: 'rep-3',
        device_id: 'dev-1',
        entity_type: 'SHOP',
        action: 'UPDATE',
        previous_state: { credit_limit_mmk: 10000000 },
        new_state: { credit_limit_mmk: 12000000 },
        gps_coordinates: '16.9234, 96.1756',
        hash: 'mock-hash-2',
        status: 'VALID',
        created_at: now - 1 * 3600 * 1000,
        shop_id: 'shop-3',
        executed_by_id: 'rep-3',
        salesperson_id: 'rep-3',
        approved_by_id: 'rep-4',
      },
    ]);

    // 11. Seed Mismatch Logs (HITL verification queue)
    await this.db.insert(schema.pgSchema.interaction_logs).values({
      id: 'log-mismatch-1',
      shop_id: 'shop-1',
      rep_id: 'viber_bot',
      type: 'VIBER',
      commercial_status: 'ORDER_PLACED',
      notes:
        'Viber order mismatch detected. OCR parsed 10 bags of GP Grout, but image shows 20 bags.',
      ai_verification_status: 'MISMATCH',
      ai_verification_notes: 'OCR mismatch: quantity check failed.',
      viber_screenshot_url: '/api/sync/uploads/mock_mismatch_screenshot.png',
      created_at_local: now - 2 * 3600 * 1000,
      device_id: 'viber_bot',
      created_at: now - 2 * 3600 * 1000,
      updated_at: now,
    });

    await this.db.insert(schema.pgSchema.interaction_items).values({
      id: 'ii-mismatch-1',
      interaction_log_id: 'log-mismatch-1',
      item_id: 'item-7',
      quantity: 10,
      unit_price_at_sale: 18000,
      interest_level: 'HIGH',
      selected_currency: 'MMK',
      selected_unit: 'PCS',
      stock_condition: 'GOOD',
      fulfillment_status: 'PENDING_FULFILLMENT',
      compliance_status: 'APPROVED',
      created_at: now - 2 * 3600 * 1000,
      updated_at: now,
    });

    // 12. Seed failed queue jobs (DLQ monitor)
    try {
      const queue = new Queue('ai-tasks', {
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
    } catch (err: $Any) {
      this.logger.warn(
        `Could not seed failed jobs to BullMQ: ${err.message || err}`,
      );
    }

    this.logger.log('Deterministic seeding completed successfully');
  }
}
