import { Database } from '@nozbe/watermelondb';
import {
  Region,
  Shop,
  Contact,
  Item,
  InteractionLog,
  InteractionItem,
  DailyQuota,
  ItemStock,
} from '@burma-inventory/shared-types';

export const seedLocalDatabase = async (database: Database): Promise<void> => {
  await database.write(async () => {
    // Clear existing records first
    const tables = [
      'interaction_items',
      'interaction_logs',
      'contacts',
      'items',
      'shops',
      'regions',
      'daily_quotas',
      'item_stocks',
    ];
    for (const t of tables) {
      try {
        const records = await database.collections.get(t).query().fetch();
        for (const r of records) {
          await r.destroyPermanently();
        }
      } catch (err) {
        console.warn(`Could not clear table ${t}:`, err);
      }
    }

    const regionsCol = database.collections.get<Region>('regions');
    const r1 = await regionsCol.create((r) => {
      r.name = 'Yangon Division';
      r.division = 'Yangon';
    });
    const r2 = await regionsCol.create((r) => {
      r.name = 'Mandalay Division';
      r.division = 'Mandalay';
    });
    const r3 = await regionsCol.create((r) => {
      r.name = 'Shan State';
      r.division = 'Shan';
    });

    const itemsCol = database.collections.get<Item>('items');
    const i1 = await itemsCol.create((item) => {
      item.sku = 'SKU-PB-640';
      item.name = 'Premium Beer 640ml';
      item.unitPrice = 3200;
      item.category = 'BEER';
    });
    const i2 = await itemsCol.create((item) => {
      item.sku = 'SKU-ST-320';
      item.name = 'Special Stout 320ml';
      item.unitPrice = 2800;
      item.category = 'BEER';
    });
    const i3 = await itemsCol.create((item) => {
      item.sku = 'SKU-CD-500';
      item.name = 'Classic Cider 500ml';
      item.unitPrice = 2500;
      item.category = 'CIDER';
    });

    // Seed stock quantities
    const itemStocksCol = database.collections.get<ItemStock>('item_stocks');
    await itemStocksCol.create((s) => {
      s.itemId = i1.id;
      s.quantity = 500;
    });
    await itemStocksCol.create((s) => {
      s.itemId = i2.id;
      s.quantity = 300;
    });
    await itemStocksCol.create((s) => {
      s.itemId = i3.id;
      s.quantity = 250;
    });

    const shopsCol = database.collections.get<Shop>('shops');
    const contactsCol = database.collections.get<Contact>('contacts');
    const logsCol =
      database.collections.get<InteractionLog>('interaction_logs');
    const logItemsCol =
      database.collections.get<InteractionItem>('interaction_items');

    const now = new Date().getTime();

    // 1. Bright Green (< 48h)
    const s1 = await shopsCol.create((s) => {
      s.name = 'Lucky Store Hledan';
      s.address = 'Hledan Center, Yangon';
      s.latitude = 16.8256;
      s.longitude = 96.1326;
      s.regionId = r1.id;
      s.lifetimeValue = 15000;
      s.sentimentTrend = 'IMPROVING';
      s.assignedRepId = 'rep-1';
    });
    await contactsCol.create((c) => {
      c.shopId = s1.id;
      c.name = 'U Kyaw';
      c.phoneNumber = '+95912345678';
      c.isPrimary = true;
    });
    const log1 = await logsCol.create((l) => {
      l.shopId = s1.id;
      l.repId = 'rep-1';
      l.type = 'SHOP_VISIT';
      l.commercialStatus = 'ORDER_PLACED';
      l.notes =
        'Owner U Kyaw is absolutely delighted with the new Premium Beer batch. Ordered 5 cases and requested early delivery next week. Extremely happy!';
      l.createdAtLocal = new Date(now - 6 * 3600 * 1000); // 6 hours ago
      l.isOfflineEntry = false;
      l.deviceId = 'dev-1';
    });
    await logItemsCol.create((li) => {
      li.interactionLogId = log1.id;
      li.itemId = i1.id;
      li.quantity = 5;
      li.unitPriceAtSale = 3200;
      li.interestLevel = 'HIGH';
    });

    // 2. Faded Green (< 7 days)
    const s2 = await shopsCol.create((s) => {
      s.name = 'City Express Tamwe';
      s.address = 'Tamwe Road, Yangon';
      s.latitude = 16.7992;
      s.longitude = 96.1798;
      s.regionId = r1.id;
      s.lifetimeValue = 25000;
      s.sentimentTrend = 'STABLE';
      s.assignedRepId = 'rep-1';
    });
    await contactsCol.create((c) => {
      c.shopId = s2.id;
      c.name = 'Daw Mya';
      c.phoneNumber = '+95998765432';
      c.isPrimary = true;
    });
    const log2 = await logsCol.create((l) => {
      l.shopId = s2.id;
      l.repId = 'rep-1';
      l.type = 'PHONE_CALL';
      l.commercialStatus = 'INTERESTED';
      l.notes =
        'Followed up via phone. Stable sales. Expressed moderate interest in trying Special Stout next month.';
      l.createdAtLocal = new Date(now - 4 * 24 * 3600 * 1000); // 4 days ago
      l.isOfflineEntry = false;
      l.deviceId = 'dev-1';
    });
    await logItemsCol.create((li) => {
      li.interactionLogId = log2.id;
      li.itemId = i1.id;
      li.quantity = 10;
      li.unitPriceAtSale = 3200;
      li.interestLevel = 'MEDIUM';
    });

    // 3. Bright Green in Mandalay
    const s3 = await shopsCol.create((s) => {
      s.name = 'Ruby Minimart Mandalay';
      s.address = '73rd Street, Mandalay';
      s.latitude = 21.9588;
      s.longitude = 96.0891;
      s.regionId = r2.id;
      s.lifetimeValue = 45000;
      s.sentimentTrend = 'IMPROVING';
      s.assignedRepId = 'rep-2';
    });
    await contactsCol.create((c) => {
      c.shopId = s3.id;
      c.name = 'U Ba';
      c.phoneNumber = '+95944445555';
      c.isPrimary = true;
    });
    const log3 = await logsCol.create((l) => {
      l.shopId = s3.id;
      l.repId = 'rep-2';
      l.type = 'SHOP_VISIT';
      l.commercialStatus = 'ORDER_PLACED';
      l.notes =
        'U Ba loves the Classic Cider and Stout. Sales are improving. Excellent relationship with Ko Hla.';
      l.createdAtLocal = new Date(now - 20 * 3600 * 1000); // 20 hours ago
      l.isOfflineEntry = false;
      l.deviceId = 'dev-2';
    });
    await logItemsCol.create((li) => {
      li.interactionLogId = log3.id;
      li.itemId = i2.id;
      li.quantity = 8;
      li.unitPriceAtSale = 2800;
      li.interestLevel = 'HIGH';
    });

    // 4. Red Neglected (Contacted 20 days ago) - Yangon
    const s4 = await shopsCol.create((s) => {
      s.name = 'Insein Market Corner';
      s.address = 'Insein Road, Yangon';
      s.latitude = 16.8894;
      s.longitude = 96.1158;
      s.regionId = r1.id;
      s.lifetimeValue = 8000;
      s.sentimentTrend = 'DECLINING';
      s.assignedRepId = 'rep-2';
    });
    await contactsCol.create((c) => {
      c.shopId = s4.id;
      c.name = 'Daw Hla';
      c.phoneNumber = '+95933332222';
      c.isPrimary = true;
    });
    const log4 = await logsCol.create((l) => {
      l.shopId = s4.id;
      l.repId = 'rep-2';
      l.type = 'VIBER_CHAT';
      l.commercialStatus = 'NOT_INTERESTED';
      l.notes =
        'Client complained about the expensive Stout prices and late delivery. Churn risk is high because a local competitor offered them a discount.';
      l.createdAtLocal = new Date(now - 20 * 24 * 3600 * 1000); // 20 days ago
      l.isOfflineEntry = false;
      l.deviceId = 'dev-2';
    });
    await logItemsCol.create((li) => {
      li.interactionLogId = log4.id;
      li.itemId = i2.id;
      li.quantity = 2;
      li.unitPriceAtSale = 2800;
      li.interestLevel = 'LOW';
    });

    // 5. Faded Green (< 7 days) - Yangon
    const s5 = await shopsCol.create((s) => {
      s.name = 'Yankin Plaza Shop';
      s.address = 'Yankin Road, Yangon';
      s.latitude = 16.8294;
      s.longitude = 96.1618;
      s.regionId = r1.id;
      s.lifetimeValue = 35000;
      s.sentimentTrend = 'STABLE';
      s.assignedRepId = 'rep-1';
    });
    await contactsCol.create((c) => {
      c.shopId = s5.id;
      c.name = 'Ko Htun';
      c.phoneNumber = '+95955556666';
      c.isPrimary = true;
    });
    await logsCol.create((l) => {
      l.shopId = s5.id;
      l.repId = 'rep-1';
      l.type = 'SHOP_VISIT';
      l.commercialStatus = 'FOLLOWED_UP';
      l.notes =
        'Routine check. Steady stocks and stable sales. Customer satisfied with current terms.';
      l.createdAtLocal = new Date(now - 3 * 24 * 3600 * 1000); // 3 days ago
      l.isOfflineEntry = false;
      l.deviceId = 'dev-1';
    });

    // 6. Yellow Warning (10 days ago) - Shan State
    const s6 = await shopsCol.create((s) => {
      s.name = 'Shan Hills Tavern';
      s.address = 'Main Road, Taunggyi';
      s.latitude = 20.7888;
      s.longitude = 97.0333;
      s.regionId = r3.id;
      s.lifetimeValue = 52000;
      s.sentimentTrend = 'DECLINING';
      s.assignedRepId = 'rep-2';
    });
    await contactsCol.create((c) => {
      c.shopId = s6.id;
      c.name = 'U Chit';
      c.phoneNumber = '+95977778888';
      c.isPrimary = true;
    });
    const log6 = await logsCol.create((l) => {
      l.shopId = s6.id;
      l.repId = 'rep-2';
      l.type = 'SHOP_VISIT';
      l.commercialStatus = 'NOT_INTERESTED';
      l.notes =
        'U Chit is unhappy with recent Stout supply delays. Competitors visited them twice this week. We must resolve the logistics issues.';
      l.createdAtLocal = new Date(now - 10 * 24 * 3600 * 1000); // 10 days ago
      l.isOfflineEntry = false;
      l.deviceId = 'dev-2';
    });
    await logItemsCol.create((li) => {
      li.interactionLogId = log6.id;
      li.itemId = i3.id;
      li.quantity = 4;
      li.unitPriceAtSale = 2500;
      li.interestLevel = 'LOW';
    });

    // 7. Red Neglected (No contact at all) - Yangon
    const s7 = await shopsCol.create((s) => {
      s.name = 'Downtown Retailer';
      s.address = 'Anawrahta Road, Yangon';
      s.latitude = 16.7736;
      s.longitude = 96.1596;
      s.regionId = r1.id;
      s.lifetimeValue = 3000;
      s.sentimentTrend = 'STABLE';
      s.assignedRepId = 'rep-1';
    });
    await contactsCol.create((c) => {
      c.shopId = s7.id;
      c.name = 'Daw Tin';
      c.phoneNumber = '+95922221111';
      c.isPrimary = true;
    });

    // 8. Yellow Warning (12 days ago) - Mandalay
    const s8 = await shopsCol.create((s) => {
      s.name = 'Hlwan Beer Station';
      s.address = 'Sagaing Road, Mandalay';
      s.latitude = 21.9333;
      s.longitude = 96.05;
      s.regionId = r2.id;
      s.lifetimeValue = 12000;
      s.sentimentTrend = 'IMPROVING';
      s.assignedRepId = 'rep-2';
    });
    await contactsCol.create((c) => {
      c.shopId = s8.id;
      c.name = 'U Hlwan';
      c.phoneNumber = '+95966667777';
      c.isPrimary = true;
    });
    const log8 = await logsCol.create((l) => {
      l.shopId = s8.id;
      l.repId = 'rep-2';
      l.type = 'PHONE_CALL';
      l.commercialStatus = 'INTERESTED';
      l.notes =
        'Spoke to U Hlwan. He was very happy and satisfied with special discount. Thinks relationship is improving.';
      l.createdAtLocal = new Date(now - 12 * 24 * 3600 * 1000); // 12 days ago
      l.isOfflineEntry = false;
      l.deviceId = 'dev-2';
    });
    await logItemsCol.create((li) => {
      li.interactionLogId = log8.id;
      li.itemId = i2.id;
      li.quantity = 3;
      li.unitPriceAtSale = 2800;
      li.interestLevel = 'MEDIUM';
    });

    // ─── Quota & Weekly Compliance Seeding ───
    const dailyQuotasCol = database.collections.get<DailyQuota>('daily_quotas');
    await dailyQuotasCol.create((q) => {
      q.userId = 'rep-1';
      q.targetVisits = 4;
      q.targetPhone = 2;
      q.targetViber = 2;
      q.effectiveFrom = new Date(now - 30 * 24 * 3600 * 1000);
    });
    await dailyQuotasCol.create((q) => {
      q.userId = 'rep-2';
      q.targetVisits = 5;
      q.targetPhone = 1;
      q.targetViber = 2;
      q.effectiveFrom = new Date(now - 30 * 24 * 3600 * 1000);
    });

    const getDayOfWeek = (offset: number) => {
      const today = new Date();
      const day = today.getDay();
      const mondayOffset = day === 0 ? -6 : 1 - day;
      const targetDay = new Date(today);
      targetDay.setDate(today.getDate() + mondayOffset + offset);
      return targetDay;
    };

    // rep-1: Monday (5 logs), Tuesday (9 logs), Thursday (2 logs), Friday (8 logs)
    const daysRep1 = [
      { dayOffset: 0, count: 5 },
      { dayOffset: 1, count: 9 },
      { dayOffset: 3, count: 2 },
      { dayOffset: 4, count: 8 },
    ];
    for (const config of daysRep1) {
      const baseDate = getDayOfWeek(config.dayOffset);
      for (let index = 0; index < config.count; index++) {
        await logsCol.create((l) => {
          l.shopId = s1.id;
          l.repId = 'rep-1';
          l.type = index % 2 === 0 ? 'SHOP_VISIT' : 'PHONE_CALL';
          l.commercialStatus = 'FOLLOWED_UP';
          l.notes = `Routine sales follow up by Ko Min. Checked stock levels. Volume detail #${index + 1}.`;
          l.createdAtLocal = new Date(
            baseDate.getTime() + (9 * 3600 + index * 3600) * 1000,
          );
          l.isOfflineEntry = false;
          l.deviceId = 'dev-1';
        });
      }
    }

    // rep-2: Monday (10 logs), Tuesday (4 logs), Friday (9 logs)
    const daysRep2 = [
      { dayOffset: 0, count: 10 },
      { dayOffset: 1, count: 4 },
      { dayOffset: 4, count: 9 },
    ];
    for (const config of daysRep2) {
      const baseDate = getDayOfWeek(config.dayOffset);
      for (let index = 0; index < config.count; index++) {
        await logsCol.create((l) => {
          l.shopId = s3.id;
          l.repId = 'rep-2';
          l.type = index % 2 === 0 ? 'SHOP_VISIT' : 'VIBER_CHAT';
          l.commercialStatus = 'FOLLOWED_UP';
          l.notes = `Operational check by Ko Hla. Customer satisfied. Record #${index + 1}.`;
          l.createdAtLocal = new Date(
            baseDate.getTime() + (9 * 3600 + index * 3600) * 1000,
          );
          l.isOfflineEntry = false;
          l.deviceId = 'dev-2';
        });
      }
    }

    // rep-2: Wednesday (6 logs in 5 minutes to trigger velocity flag)
    const wednesdayBase = getDayOfWeek(2);
    for (let index = 0; index < 6; index++) {
      await logsCol.create((l) => {
        l.shopId = s3.id;
        l.repId = 'rep-2';
        l.type = 'VIBER_CHAT';
        l.commercialStatus = 'INTERESTED';
        l.notes = `Batch log entry #${index + 1} - Checking retail inventory shelf status. Competitor pricing check.`;
        l.createdAtLocal = new Date(
          wednesdayBase.getTime() + (12 * 3600 + index * 60) * 1000,
        );
        l.isOfflineEntry = false;
        l.deviceId = 'dev-2';
      });
    }
  });
};
