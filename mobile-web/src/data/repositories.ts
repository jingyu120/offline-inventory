import { database } from '../database';
import { sqliteSchema } from '@burma-inventory/shared-types';
import { eq, like, inArray, desc } from 'drizzle-orm';
import {
  Shop,
  Region,
  Contact,
  InteractionLog,
  InteractionItem,
  Item,
  ItemStock,
  DailyQuota,
  guardAsync,
} from '@burma-inventory/shared-types';

export interface ShopWithDetails extends Shop {
  regionName: string;
  lastInteractionDate?: Date;
}

export interface LogWithItems {
  log: InteractionLog;
  items: {
    id: string;
    name: string;
    sku: string;
    quantity: number;
  }[];
}

export interface ShopDetailPayload {
  contacts: Contact[];
  logsWithItems: LogWithItems[];
}

// Row mappers from DB (snake_case) to Frontend (camelCase)
export const mapRegion = (r: any): Region => ({
  id: r.id,
  name: r.name,
  division: r.division,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export const mapShop = (s: any): Shop => ({
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
  createdAt: s.created_at,
  updatedAt: s.updated_at,
});

export const mapContact = (c: any): Contact => ({
  id: c.id,
  shopId: c.shop_id,
  name: c.name,
  phoneNumber: c.phone_number,
  email: c.email,
  isPrimary: !!c.is_primary,
  createdAt: c.created_at,
  updatedAt: c.updated_at,
});

export const mapItem = (i: any): Item => ({
  id: i.id,
  sku: i.sku,
  name: i.name,
  unitPrice: i.unit_price,
  category: i.category,
  createdAt: i.created_at,
  updatedAt: i.updated_at,
});

export const mapInteractionLog = (l: any): InteractionLog => ({
  id: l.id,
  shopId: l.shop_id,
  repId: l.rep_id,
  type: l.type,
  commercialStatus: l.commercial_status,
  notes: l.notes,
  nextFollowUpDate: l.next_follow_up_date,
  viberScreenshotUrl: l.viber_screenshot_url,
  createdAtLocal: l.created_at_local,
  syncedAtServer: l.synced_at_server,
  isOfflineEntry: !!l.is_offline_entry,
  deviceId: l.device_id,
  createdAt: l.created_at,
  updatedAt: l.updated_at,
});

export const mapInteractionItem = (ii: any): InteractionItem => ({
  id: ii.id,
  interactionLogId: ii.interaction_log_id,
  itemId: ii.item_id,
  quantity: ii.quantity,
  unitPriceAtSale: ii.unit_price_at_sale,
  interestLevel: ii.interest_level,
  unitPrice: ii.unit_price,
  selectedCurrency: ii.selected_currency,
  createdAt: ii.created_at,
  updatedAt: ii.updated_at,
});

export const mapDailyQuota = (q: any): DailyQuota => ({
  id: q.id,
  userId: q.user_id,
  targetVisits: q.target_visits,
  targetPhone: q.target_phone,
  targetViber: q.target_viber,
  effectiveFrom: q.effective_from,
  createdAt: q.created_at,
  updatedAt: q.updated_at,
});

export const mapItemStock = (s: any): ItemStock => ({
  id: s.id,
  itemId: s.item_id,
  quantity: s.quantity,
  createdAt: s.created_at,
  updatedAt: s.updated_at,
});

export const fetchShops = async (
  searchQuery?: string,
): Promise<ShopWithDetails[]> => {
  let query = database.select().from(sqliteSchema.shops);
  if (searchQuery) {
    query = query.where(
      like(sqliteSchema.shops.name, `%${searchQuery}%`),
    ) as any;
  }
  const fetchedShops = await query;

  const regions = await database.select().from(sqliteSchema.regions);
  const regionMap = new Map<string, string>(
    regions.map((r: any) => [r.id, r.name || '']),
  );

  let allLogs: any[] = [];
  if (fetchedShops.length > 0) {
    const shopIds = fetchedShops.map((s: any) => s.id);
    const chunkSize = 500;
    const promises = [];
    for (let i = 0; i < shopIds.length; i += chunkSize) {
      const chunk = shopIds.slice(i, i + chunkSize);
      promises.push(
        database
          .select()
          .from(sqliteSchema.interaction_logs)
          .where(inArray(sqliteSchema.interaction_logs.shop_id, chunk)),
      );
    }
    const results = await Promise.all(promises);
    allLogs = results.flat();
  }

  const lastLogMap = new Map<string, Date>();
  allLogs.forEach((l) => {
    const current = lastLogMap.get(l.shop_id);
    const logDate = new Date(l.created_at_local);
    if (!current || logDate > current) {
      lastLogMap.set(l.shop_id, logDate);
    }
  });

  return fetchedShops.map((s: any) => {
    const shopObj = mapShop(s) as ShopWithDetails;
    shopObj.regionName = regionMap.get(s.region_id) || 'Unknown Region';
    shopObj.lastInteractionDate = lastLogMap.get(s.id);
    return shopObj;
  });
};

export const fetchShopDetails = async (
  shopId: string,
): Promise<ShopDetailPayload> => {
  const contactsList = await database
    .select()
    .from(sqliteSchema.contacts)
    .where(eq(sqliteSchema.contacts.shop_id, shopId));

  const logs = await database
    .select()
    .from(sqliteSchema.interaction_logs)
    .where(eq(sqliteSchema.interaction_logs.shop_id, shopId))
    .orderBy(desc(sqliteSchema.interaction_logs.created_at));

  const logsWithItems = await Promise.all(
    logs.map(async (log: any) => {
      const itemsList = await database
        .select()
        .from(sqliteSchema.interaction_items)
        .where(eq(sqliteSchema.interaction_items.interaction_log_id, log.id));

      const itemsWithDetails = await Promise.all(
        itemsList.map(async (ii: any) => {
          try {
            const itemDetails = await database
              .select()
              .from(sqliteSchema.items)
              .where(eq(sqliteSchema.items.id, ii.item_id));
            const itemDetail = itemDetails[0];
            return {
              id: ii.id,
              name: itemDetail ? itemDetail.name : 'Unknown Item',
              sku: itemDetail ? itemDetail.sku : 'N/A',
              quantity: ii.quantity,
            };
          } catch {
            return {
              id: ii.id,
              name: 'Unknown Item',
              sku: 'N/A',
              quantity: ii.quantity,
            };
          }
        }),
      );

      return {
        log: mapInteractionLog(log),
        items: itemsWithDetails,
      };
    }),
  );

  return {
    contacts: contactsList.map(mapContact),
    logsWithItems,
  };
};

export const fetchItemsAndStockLevel = async (): Promise<{
  items: Item[];
  stocksMap: Record<string, number>;
}> => {
  const itemsList = await database.select().from(sqliteSchema.items);
  const stocks = await database.select().from(sqliteSchema.item_stocks);

  const stocksMap: Record<string, number> = {};
  stocks.forEach((s: any) => {
    stocksMap[s.item_id] = s.quantity;
  });

  return {
    items: itemsList.map(mapItem),
    stocksMap,
  };
};

export interface SelectedItemPayload {
  item: Item;
  quantity: number;
  unitPrice?: number;
  selectedCurrency?: string;
}

function generateId(): string {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}

export const createInteractionLog = async (
  shopId: string,
  repId: string,
  type: string,
  commercialStatus: string,
  notes: string,
  screenshotUri: string | null,
  selectedItems: SelectedItemPayload[],
): Promise<void> => {
  const [, error] = await guardAsync(
    (async () => {
      const now = Date.now();
      const newLogId = generateId();

      // Insert Interaction Log
      await database.insert(sqliteSchema.interaction_logs).values({
        id: newLogId,
        shop_id: shopId,
        rep_id: repId,
        type: type,
        commercial_status: commercialStatus,
        notes: notes,
        viber_screenshot_url: screenshotUri || null,
        created_at_local: now,
        is_offline_entry: true,
        device_id: 'dev-1',
        created_at: now,
        updated_at: now,
      });

      // Insert Interaction Items and update Stock
      for (const selected of selectedItems) {
        const newiiId = generateId();
        await database.insert(sqliteSchema.interaction_items).values({
          id: newiiId,
          interaction_log_id: newLogId,
          item_id: selected.item.id,
          quantity: selected.quantity,
          unit_price_at_sale: selected.unitPrice || selected.item.unitPrice,
          unit_price: selected.unitPrice || selected.item.unitPrice,
          selected_currency: selected.selectedCurrency || 'MMK',
          created_at: now,
          updated_at: now,
        });

        // Update Stock
        const stockRecords = await database
          .select()
          .from(sqliteSchema.item_stocks)
          .where(eq(sqliteSchema.item_stocks.item_id, selected.item.id));

        if (stockRecords.length > 0) {
          const stockRecord = stockRecords[0];
          const newQty = Math.max(0, stockRecord.quantity - selected.quantity);
          await database
            .update(sqliteSchema.item_stocks)
            .set({ quantity: newQty, updated_at: now })
            .where(eq(sqliteSchema.item_stocks.id, stockRecord.id));
        }
      }
    })(),
  );

  if (error) {
    console.error('Database mutation failed in createInteractionLog:', error);
    throw error;
  }
};

export const fetchRegions = async (): Promise<Region[]> => {
  const regionsList = await database.select().from(sqliteSchema.regions);
  return regionsList.map(mapRegion);
};

export const fetchDailyQuotas = async (): Promise<DailyQuota[]> => {
  const quotas = await database.select().from(sqliteSchema.daily_quotas);
  return quotas.map(mapDailyQuota);
};

export const fetchInteractionLogs = async (): Promise<InteractionLog[]> => {
  const logs = await database.select().from(sqliteSchema.interaction_logs);
  return logs.map(mapInteractionLog);
};

export const fetchAllItems = async (): Promise<Item[]> => {
  const itemsList = await database.select().from(sqliteSchema.items);
  return itemsList.map(mapItem);
};

export const fetchAllInteractionItems = async (): Promise<
  InteractionItem[]
> => {
  const itemsList = await database
    .select()
    .from(sqliteSchema.interaction_items);
  return itemsList.map(mapInteractionItem);
};

export const applyQuotaAdjustments = async (
  repId: string,
  visits: number,
  phone: number,
  viber: number,
): Promise<DailyQuota[]> => {
  const dailyQuotasCol = sqliteSchema.daily_quotas;
  const now = Date.now();
  const newQuotaId = generateId();

  const [, error] = await guardAsync(
    database.insert(dailyQuotasCol).values({
      id: newQuotaId,
      user_id: repId,
      target_visits: visits,
      target_phone: phone,
      target_viber: viber,
      effective_from: now,
      created_at: now,
      updated_at: now,
    }),
  );

  if (error) {
    console.error('Database mutation failed in applyQuotaAdjustments:', error);
    throw error;
  }

  return fetchDailyQuotas();
};
