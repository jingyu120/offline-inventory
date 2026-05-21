import { Q } from '@nozbe/watermelondb';
import { database } from '../database';
import {
  Shop,
  Region,
  Contact,
  InteractionLog,
  InteractionItem,
  Item,
  ItemStock,
  DailyQuota,
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

export const fetchShops = async (
  searchQuery?: string,
): Promise<ShopWithDetails[]> => {
  const shopsCollection = database.collections.get<Shop>('shops');
  const regionsCollection = database.collections.get<Region>('regions');
  const logsCollection =
    database.collections.get<InteractionLog>('interaction_logs');

  let query = shopsCollection.query();
  if (searchQuery) {
    query = shopsCollection.query(
      Q.where('name', Q.like(`%${Q.sanitizeLikeString(searchQuery)}%`)),
    );
  }

  const fetchedShops = await query.fetch();
  const regions = await regionsCollection.query().fetch();
  const regionMap = new Map(regions.map((r) => [r.id, r.name]));

  let allLogs: InteractionLog[] = [];
  if (fetchedShops.length > 0) {
    const shopIds = fetchedShops.map((s) => s.id);
    const chunkSize = 500;
    const promises = [];
    for (let i = 0; i < shopIds.length; i += chunkSize) {
      const chunk = shopIds.slice(i, i + chunkSize);
      promises.push(
        logsCollection.query(Q.where('shop_id', Q.oneOf(chunk))).fetch(),
      );
    }
    const results = await Promise.all(promises);
    allLogs = results.flat();
  }

  const lastLogMap = new Map<string, Date>();
  allLogs.forEach((l) => {
    const current = lastLogMap.get(l.shopId);
    if (!current || l.createdAtLocal > current) {
      lastLogMap.set(l.shopId, l.createdAtLocal);
    }
  });

  return fetchedShops.map((s) => {
    const shopObj = s as unknown as ShopWithDetails;
    shopObj.regionName = regionMap.get(s.regionId) || 'Unknown Region';
    shopObj.lastInteractionDate = lastLogMap.get(s.id);
    return shopObj;
  });
};

export const fetchShopDetails = async (
  shopId: string,
): Promise<ShopDetailPayload> => {
  const contacts = await database.collections
    .get<Contact>('contacts')
    .query(Q.where('shop_id', shopId))
    .fetch();
  const logs = await database.collections
    .get<InteractionLog>('interaction_logs')
    .query(Q.where('shop_id', shopId), Q.sortBy('created_at', Q.desc))
    .fetch();

  const logsWithItems = await Promise.all(
    logs.map(async (log) => {
      const items = await database.collections
        .get<InteractionItem>('interaction_items')
        .query(Q.where('interaction_log_id', log.id))
        .fetch();

      const itemsWithDetails = await Promise.all(
        items.map(async (ii) => {
          try {
            const itemDetail = await database.collections
              .get<Item>('items')
              .find(ii.itemId);
            return {
              id: ii.id,
              name: itemDetail.name,
              sku: itemDetail.sku,
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
        log,
        items: itemsWithDetails,
      };
    }),
  );

  return { contacts, logsWithItems };
};

export const fetchItemsAndStockLevel = async (): Promise<{
  items: Item[];
  stocksMap: Record<string, number>;
}> => {
  const items = await database.collections.get<Item>('items').query().fetch();
  const stocks = await database.collections
    .get<ItemStock>('item_stocks')
    .query()
    .fetch();

  const stocksMap: Record<string, number> = {};
  stocks.forEach((s) => {
    stocksMap[s.itemId] = s.quantity;
  });

  return { items, stocksMap };
};

export interface SelectedItemPayload {
  item: Item;
  quantity: number;
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
  await database.write(async () => {
    const logsCol =
      database.collections.get<InteractionLog>('interaction_logs');
    const itemsCol =
      database.collections.get<InteractionItem>('interaction_items');
    const itemStocksCol = database.collections.get<ItemStock>('item_stocks');

    const newLog = await logsCol.create((l) => {
      l.shopId = shopId;
      l.repId = repId;
      l.type = type;
      l.commercialStatus = commercialStatus;
      l.notes = notes;
      l.viberScreenshotUrl = screenshotUri || undefined;
      l.createdAtLocal = new Date();
      l.isOfflineEntry = true;
      l.deviceId = 'dev-1';
    });

    for (const selected of selectedItems) {
      await itemsCol.create((ii) => {
        ii.interactionLogId = newLog.id;
        ii.itemId = selected.item.id;
        ii.quantity = selected.quantity;
        ii.unitPriceAtSale = selected.item.unitPrice;
      });

      const stockRecords = await itemStocksCol
        .query(Q.where('item_id', selected.item.id))
        .fetch();
      if (stockRecords.length > 0) {
        const stockRecord = stockRecords[0];
        await stockRecord.update((s) => {
          s.quantity = Math.max(0, s.quantity - selected.quantity);
        });
      }
    }
  });
};

export const fetchRegions = async (): Promise<Region[]> => {
  return await database.collections.get<Region>('regions').query().fetch();
};

export const fetchDailyQuotas = async (): Promise<DailyQuota[]> => {
  return await database.collections
    .get<DailyQuota>('daily_quotas')
    .query()
    .fetch();
};

export const fetchInteractionLogs = async (): Promise<InteractionLog[]> => {
  return await database.collections
    .get<InteractionLog>('interaction_logs')
    .query()
    .fetch();
};

export const fetchAllItems = async (): Promise<Item[]> => {
  return await database.collections.get<Item>('items').query().fetch();
};

export const fetchAllInteractionItems = async (): Promise<
  InteractionItem[]
> => {
  return await database.collections
    .get<InteractionItem>('interaction_items')
    .query()
    .fetch();
};

export const applyQuotaAdjustments = async (
  repId: string,
  visits: number,
  phone: number,
  viber: number,
): Promise<DailyQuota[]> => {
  const dailyQuotasCol = database.collections.get<DailyQuota>('daily_quotas');
  const now = new Date();

  await database.write(async () => {
    await dailyQuotasCol.create((q) => {
      q.userId = repId;
      q.targetVisits = visits;
      q.targetPhone = phone;
      q.targetViber = viber;
      q.effectiveFrom = now;
    });
  });

  return await dailyQuotasCol.query().fetch();
};
