import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const url = process.env['DATABASE_URL'];
    if (!url) throw new Error('DATABASE_URL is not defined');

    const pool = new Pool({ connectionString: url });
    const adapter = new PrismaPg(pool);
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Connected to PostgreSQL');

    try {
      const hashedPassword = await bcrypt.hash('changeme-rep-default', 10);

      // 1. Seed Regions
      await (this as any).region.upsert({
        where: { id: 'region-yangon' },
        update: {},
        create: {
          id: 'region-yangon',
          name: 'Yangon Region',
          division: 'Yangon Division',
        },
      });

      await (this as any).region.upsert({
        where: { id: 'region-mandalay' },
        update: {},
        create: {
          id: 'region-mandalay',
          name: 'Mandalay Region',
          division: 'Mandalay Division',
        },
      });

      // 2. Seed Users
      const usersData = [
        {
          id: 'rep-1',
          username: 'rep1',
          role: 'sales',
          regionId: 'region-yangon',
        },
        {
          id: 'rep-2',
          username: 'rep2',
          role: 'sales',
          regionId: 'region-mandalay',
        },
        { id: 'rep-3', username: 'rep3', role: 'manager', regionId: null },
        { id: 'rep-4', username: 'rep4', role: 'admin', regionId: null },
        { id: 'rep-5', username: 'rep5', role: 'intake', regionId: null },
      ];

      for (const u of usersData) {
        await (this as any).user.upsert({
          where: { id: u.id },
          update: { role: u.role, regionId: u.regionId },
          create: {
            id: u.id,
            username: u.username,
            password: hashedPassword,
            role: u.role,
            regionId: u.regionId,
          },
        });
      }
      this.logger.log(
        'Seeded 5 mock users (roles: sales, manager, admin, intake)',
      );

      // 3. Seed Price Books
      await (this as any).priceBook.upsert({
        where: { name: 'Yangon Retail Book' },
        update: {},
        create: {
          id: 'pb-yangon',
          name: 'Yangon Retail Book',
          regionId: 'region-yangon',
        },
      });

      await (this as any).priceBook.upsert({
        where: { name: 'Mandalay Wholesale Book' },
        update: {},
        create: {
          id: 'pb-mandalay',
          name: 'Mandalay Wholesale Book',
          regionId: 'region-mandalay',
        },
      });

      // 3.5. Seed Projects
      const projectsData = [
        { id: 'project-1', name: 'Galaxy Tower-3' },
        { id: 'project-2', name: 'Zaw Residence' },
        { id: 'project-3', name: 'Grand Plaza Project' },
      ];

      for (const p of projectsData) {
        await (this as any).project.upsert({
          where: { id: p.id },
          update: { name: p.name },
          create: {
            id: p.id,
            name: p.name,
          },
        });
      }

      // Seed Brand Crocodile
      await (this as any).brand.upsert({
        where: { id: 'brand-crocodile' },
        update: { name: 'Crocodile' },
        create: {
          id: 'brand-crocodile',
          name: 'Crocodile',
        },
      });

      // 4. Seed items & stocks
      const itemsData = [
        {
          id: 'item-1',
          sku: 'SKU-SH-6MM',
          name: 'Shera Fiber Cement Board 6mm',
          unitPrice: 15000.0,
          category: 'Fiber Cement',
          quantity: 150,
          color: 'Off-White',
          materialSubType: 'MR',
          hardwareFinish: null,
          isInDeficit: true,
        },
        {
          id: 'item-2',
          sku: 'SKU-GT-PVC-12',
          name: 'Gator PVC Pipe 1/2 inch',
          unitPrice: 4500.0,
          category: 'Plumbing',
          quantity: 300,
          color: 'Blue',
          materialSubType: 'RE',
          hardwareFinish: null,
          isInDeficit: false,
        },
        {
          id: 'item-3',
          sku: 'SKU-KR-WC',
          name: 'Karat Ceramic Water Closet',
          unitPrice: 180000.0,
          category: 'Sanitaryware',
          quantity: 500,
          color: 'White',
          materialSubType: null,
          hardwareFinish: 'CP',
          isInDeficit: false,
        },
        {
          id: 'item-4',
          sku: 'SKU-VR-FC',
          name: 'VRH Stainless steel Faucet',
          unitPrice: 35000.0,
          category: 'Fittings',
          quantity: 200,
          color: 'Silver',
          materialSubType: null,
          hardwareFinish: 'BL',
          isInDeficit: false,
        },
        {
          id: 'item-5',
          sku: 'SKU-SCG-8MM',
          name: 'SCG Smart Board 8mm',
          unitPrice: 22000.0,
          category: 'Fiber Cement',
          quantity: 120,
          color: 'Grey',
          materialSubType: 'MR',
          hardwareFinish: null,
          isInDeficit: false,
        },
        {
          id: 'item-6',
          sku: 'SKU-KN-GP-9MM',
          name: 'Knauf Gypsum Board 9mm',
          unitPrice: 12500.0,
          category: 'Drywall',
          quantity: 180,
          color: 'White',
          materialSubType: 'RE',
          hardwareFinish: null,
          isInDeficit: false,
        },
        {
          id: 'item-7',
          sku: 'SKU-CR-GP-GROUT',
          name: 'Crocodile GP Grout',
          unitPrice: 18000.0,
          category: 'Grout',
          brandId: 'brand-crocodile',
          quantity: 0,
          pendingAllocationCount: 1756,
          color: 'Grey',
          materialSubType: null,
          hardwareFinish: null,
          isInDeficit: false,
        },
      ];

      for (const item of itemsData) {
        // Upsert Item
        await (this as any).item.upsert({
          where: { id: item.id },
          update: {
            sku: item.sku,
            name: item.name,
            unitPrice: item.unitPrice,
            category: item.category,
            brandId: (item as any).brandId || null,
            color: item.color,
            materialSubType: item.materialSubType,
            hardwareFinish: item.hardwareFinish,
            isInDeficit: item.isInDeficit,
          },
          create: {
            id: item.id,
            sku: item.sku,
            name: item.name,
            unitPrice: item.unitPrice,
            category: item.category,
            brandId: (item as any).brandId || null,
            color: item.color,
            materialSubType: item.materialSubType,
            hardwareFinish: item.hardwareFinish,
            isInDeficit: item.isInDeficit,
          },
        });

        // Upsert Stock
        await (this as any).itemStock.upsert({
          where: { itemId: item.id },
          update: {
            quantity: item.quantity,
            pendingAllocationCount: (item as any).pendingAllocationCount || 0,
          },
          create: {
            itemId: item.id,
            quantity: item.quantity,
            pendingAllocationCount: (item as any).pendingAllocationCount || 0,
          },
        });

        // Upsert Price Book Items (MMK for local, USD and THB for exchange rate testing)
        // pb-yangon items
        await (this as any).priceBookItem.upsert({
          where: { id: `pbi-y-${item.id}` },
          update: {},
          create: {
            id: `pbi-y-${item.id}`,
            priceBookId: 'pb-yangon',
            itemId: item.id,
            price: item.unitPrice, // Retail price
            currency: 'MMK',
          },
        });

        // pb-mandalay items (wholesale discount: 10% off)
        await (this as any).priceBookItem.upsert({
          where: { id: `pbi-m-${item.id}` },
          update: {},
          create: {
            id: `pbi-m-${item.id}`,
            priceBookId: 'pb-mandalay',
            itemId: item.id,
            price: item.unitPrice * 0.9,
            currency: 'MMK',
          },
        });
      }

      // 5. Seed Exchange Rates (USD/THB to MMK conversion)
      const rates = [
        { from: 'USD', to: 'MMK', rate: 2100.0 },
        { from: 'THB', to: 'MMK', rate: 58.5 },
      ];
      for (const rate of rates) {
        await (this as any).exchangeRate.upsert({
          where: {
            fromCurrency_toCurrency: {
              fromCurrency: rate.from,
              toCurrency: rate.to,
            },
          },
          update: { rate: rate.rate },
          create: {
            fromCurrency: rate.from,
            toCurrency: rate.to,
            rate: rate.rate,
          },
        });
      }

      // 6. Seed Shops with region association & price book association
      const shopsData = [
        {
          id: 'shop-1',
          name: 'City Mart Junction City',
          address: 'Bogyoke Aung San Rd, Yangon',
          latitude: 16.7794,
          longitude: 96.1518,
          regionId: 'region-yangon',
          priceBookId: 'pb-yangon',
          ltv: 1250000.0,
          trend: 'IMPROVING',
        },
        {
          id: 'shop-2',
          name: 'Ruby Supermarket Mandalay',
          address: '78th St, Mandalay',
          latitude: 21.9754,
          longitude: 96.0838,
          regionId: 'region-mandalay',
          priceBookId: 'pb-mandalay',
          ltv: 980000.0,
          trend: 'STABLE',
        },
        {
          id: 'shop-3',
          name: 'Kantharyar Shopping Centre',
          address: 'U Aung Myat St, Yangon',
          latitude: 16.7932,
          longitude: 96.1664,
          regionId: 'region-yangon',
          priceBookId: 'pb-yangon',
          ltv: 450000.0,
          trend: 'DECLINING',
        },
        {
          id: 'shop-4',
          name: 'Mandalay Station Store',
          address: 'Railway Station Ground, Mandalay',
          latitude: 21.9685,
          longitude: 96.0852,
          regionId: 'region-mandalay',
          priceBookId: 'pb-mandalay',
          ltv: 150000.0,
          trend: 'IMPROVING',
        },
      ];

      for (const s of shopsData) {
        await (this as any).shop.upsert({
          where: { id: s.id },
          update: { regionId: s.regionId, priceBookId: s.priceBookId },
          create: {
            id: s.id,
            name: s.name,
            address: s.address,
            latitude: s.latitude,
            longitude: s.longitude,
            regionId: s.regionId,
            priceBookId: s.priceBookId,
            lifetimeValue: s.ltv,
            sentimentTrend: s.trend,
          },
        });

        // Seed Churn Analytics predictions
        await (this as any).predictionLog.upsert({
          where: { id: `pred-${s.id}` },
          update: {},
          create: {
            id: `pred-${s.id}`,
            shopId: s.id,
            predictedLtv: s.ltv * 1.1,
            churnRisk:
              s.trend === 'DECLINING'
                ? 0.82
                : s.trend === 'STABLE'
                  ? 0.35
                  : 0.08,
            stockoutRisk: s.id === 'shop-1' || s.id === 'shop-3' ? 0.65 : 0.15,
          },
        });

        // Seed Recommended Orders (Phase 7 AI)
        await (this as any).recommendedOrder.upsert({
          where: { id: `rec-${s.id}-item-1` },
          update: {},
          create: {
            id: `rec-${s.id}-item-1`,
            shopId: s.id,
            itemId: 'item-1',
            quantity: s.id === 'shop-1' ? 48 : 24,
            confidence: 0.89,
          },
        });
      }

      // 7. Seed Daily Routes for Sales Representatives (Phase 5)
      // Ko Min route: shop-1, shop-3
      await (this as any).plannedRoute.upsert({
        where: { id: 'route-ko-min' },
        update: {},
        create: {
          id: 'route-ko-min',
          repId: 'rep-1',
          date: new Date().toISOString().split('T')[0],
          shopIds: JSON.stringify(['shop-1', 'shop-3']),
        },
      });

      // Ko Hla route: shop-2, shop-4
      await (this as any).plannedRoute.upsert({
        where: { id: 'route-ko-hla' },
        update: {},
        create: {
          id: 'route-ko-hla',
          repId: 'rep-2',
          date: new Date().toISOString().split('T')[0],
          shopIds: JSON.stringify(['shop-2', 'shop-4']),
        },
      });

      // 8. Seed Rep Scores / Gamification Leaderboard
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
        await (this as any).repScore.upsert({
          where: { repId: sc.repId },
          update: { points: sc.points, streakDays: sc.streakDays },
          create: {
            repId: sc.repId,
            points: sc.points,
            streakDays: sc.streakDays,
            badges: sc.badges,
          },
        });
      }

      this.logger.log(
        'Seeded E2E dataset (Regions, Shops, Price Books, Predictions, Routes, Scores) successfully',
      );
    } catch (error: any) {
      this.logger.error(
        'Failed to seed E2E dataset:',
        error.stack || error.message || error,
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Disconnected from PostgreSQL');
  }
}
