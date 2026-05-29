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
            quantity: item.quantity,
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
            shop_ids: JSON.stringify(['shop-2', 'shop-4']),
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

      this.logger.log('Seeded E2E dataset (Drizzle version) successfully');
    } catch (error: any) {
      this.logger.error(
        'Failed to seed E2E dataset:',
        error.stack || error.message || error,
      );
    }
  }
}
