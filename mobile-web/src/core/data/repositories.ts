import { database } from '../database/database';
import { eq, like, inArray, desc, isNull, and } from 'drizzle-orm';
import {
  sqliteSchema,
  Shop,
  Region,
  Contact,
  InteractionLog,
  InteractionItem,
  Item,
  ItemStock,
  DailyQuota,
  ExpectedInbound,
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
export const mapRegion = (r: $Any): Region => ({
  id: r.id,
  name: r.name,
  division: r.division,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export const mapShop = (s: $Any): Shop => ({
  id: s.id,
  name: s.name,
  address: s.address,
  latitude: s.latitude,
  longitude: s.longitude,
  regionId: s.region_id,
  townshipId: s.township_id,
  wardId: s.ward_id,
  assignedRepId: s.assigned_rep_id,
  lifetimeValue: s.lifetime_value,
  sentimentTrend: s.sentiment_trend,
  priceBookId: s.price_book_id,
  priceTier: s.price_tier,
  creditLimitMmk: s.credit_limit_mmk || 0,
  createdAt: s.created_at,
  updatedAt: s.updated_at,
});

export const mapContact = (c: $Any): Contact => ({
  id: c.id,
  shopId: c.shop_id,
  name: c.name,
  phoneNumber: c.phone_number,
  email: c.email,
  isPrimary: !!c.is_primary,
  createdAt: c.created_at,
  updatedAt: c.updated_at,
});

export const mapItem = (i: $Any): Item => ({
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
  isInDeficit: !!i.is_in_deficit,
  baseWholesalePrice: i.base_wholesale_price,
  baseCurrency: i.base_currency,
  volumeDiscountBrackets: i.volume_discount_brackets,
  inventoryStatus: i.inventory_status,
  createdAt: i.created_at,
  updatedAt: i.updated_at,
  finishCode: i.finish_code,
  structuralClass: i.structural_class,
  dimensions: i.dimensions,
});

export const mapInteractionLog = (l: $Any): InteractionLog => ({
  id: l.id,
  shopId: l.shop_id,
  repId: l.rep_id,
  projectId: l.project_id,
  type: l.type,
  commercialStatus: l.commercial_status,
  notes: l.notes,
  nextFollowUpDate: l.next_follow_up_date,
  viberScreenshotUrl: l.viber_screenshot_url,
  createdAtLocal: l.created_at_local,
  syncedAtServer: l.synced_at_server,
  isOfflineEntry: !!l.is_offline_entry,
  deviceId: l.device_id,
  executedById: l.executed_by_id,
  salespersonId: l.salesperson_id,
  approvedById: l.approved_by_id,
  createdAt: l.created_at,
  updatedAt: l.updated_at,
  negotiatedPrice: l.negotiated_price,
  objectionReason: l.objection_reason,
  competitorPrice: l.competitor_price,
  viberMessageText: l.viber_message_text,
});

export const mapInteractionItem = (ii: $Any): InteractionItem => ({
  id: ii.id,
  interactionLogId: ii.interaction_log_id,
  itemId: ii.item_id,
  quantity: ii.quantity,
  unitPriceAtSale: ii.unit_price_at_sale,
  interestLevel: ii.interest_level,
  unitPrice: ii.unit_price,
  selectedCurrency: ii.selected_currency,
  selectedUnit: ii.selected_unit,
  stockCondition: ii.stock_condition,
  pendingAllocationCount: ii.pending_allocation_count ?? 0,
  fulfillmentStatus: ii.fulfillment_status ?? 'PENDING_FULFILLMENT',
  complianceStatus: ii.compliance_status ?? 'APPROVED',
  createdAt: ii.created_at,
  updatedAt: ii.updated_at,
});

export const mapDailyQuota = (q: $Any): DailyQuota => ({
  id: q.id,
  userId: q.user_id,
  targetVisits: q.target_visits,
  targetPhone: q.target_phone,
  targetViber: q.target_viber,
  effectiveFrom: q.effective_from,
  createdAt: q.created_at,
  updatedAt: q.updated_at,
});

export const mapItemStock = (s: $Any): ItemStock => ({
  id: s.id,
  itemId: s.item_id,
  goodStockCount: s.good_stock_count ?? 0,
  wetStockCount: s.wet_stock_count ?? 0,
  badStockCount: s.bad_stock_count ?? 0,
  pendingAllocationCount: s.pending_allocation_count ?? 0,
  inventoryStatus: s.inventory_status,
  createdAt: s.created_at,
  updatedAt: s.updated_at,
});

export const fetchShops = async (
  searchQuery?: string,
): Promise<ShopWithDetails[]> => {
  let query = database.select().from(sqliteSchema.shops);
  if (searchQuery) {
    query = query.where(
      and(
        like(sqliteSchema.shops.name, `%${searchQuery}%`),
        isNull(sqliteSchema.shops.deleted_at),
      ),
    ) as $Any;
  } else {
    query = query.where(isNull(sqliteSchema.shops.deleted_at)) as $Any;
  }
  const fetchedShops = await query;

  const regions = await database.select().from(sqliteSchema.regions);
  const regionMap = new Map<string, string>(
    regions.map((r: $Any) => [r.id, r.name || '']),
  );

  let allLogs: $Any[] = [];
  if (fetchedShops.length > 0) {
    const shopIds = fetchedShops.map((s: $Any) => s.id);
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

  return fetchedShops.map((s: $Any) => {
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
    logs.map(async (log: $Any) => {
      const itemsList = await database
        .select()
        .from(sqliteSchema.interaction_items)
        .where(eq(sqliteSchema.interaction_items.interaction_log_id, log.id));

      const itemsWithDetails = await Promise.all(
        itemsList.map(async (ii: $Any) => {
          try {
            const itemDetails = await database
              .select()
              .from(sqliteSchema.items)
              .where(
                and(
                  eq(sqliteSchema.items.id, ii.item_id),
                  isNull(sqliteSchema.items.deleted_at),
                ),
              );
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
  const itemsList = await database
    .select()
    .from(sqliteSchema.items)
    .where(isNull(sqliteSchema.items.deleted_at));
  const stocks = await database.select().from(sqliteSchema.item_stocks);

  const stocksMap: Record<string, number> = {};
  stocks.forEach((s: $Any) => {
    stocksMap[s.item_id] = s.good_stock_count ?? 0;
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
  selectedUnit?: string;
  stockCondition?: string;
  pendingAllocationCount?: number;
}

function generateId(): string {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}

export const getConversionMultiplier = (
  item: Item,
  selectedUnit: string,
): number => {
  if (!selectedUnit || selectedUnit === 'PCS') return 1;
  if (selectedUnit === item.unitType) return item.conversionFactor || 1;
  switch (selectedUnit) {
    case 'PK':
      return 10;
    case 'BAGS':
      return 40;
    case 'PAL':
      return 100;
    default:
      return 1;
  }
};

import { getDeviceId } from '../storage/platformStorage';
import { writeAuditEvent } from '../utils/audit';

export const createInteractionLog = async (
  shopId: string,
  repId: string,
  type: string,
  commercialStatus: string,
  notes: string,
  screenshotUri: string | null,
  selectedItems: SelectedItemPayload[],
  projectId: string | null = null,
  traceId?: string,
  actorId?: string,
  negotiatedPrice: number | null = null,
  objectionReason: string | null = null,
  competitorPrice: number | null = null,
  viberMessageText: string | null = null,
): Promise<string> => {
  let newLogId = '';
  const [, error] = await guardAsync(
    database.transaction(async (tx) => {
      const now = Date.now();
      newLogId = generateId();
      const deviceId = await getDeviceId();
      const activeActor = actorId || repId || 'system';

      // Insert Interaction Log
      const incomingLog = {
        id: newLogId,
        shop_id: shopId,
        rep_id: repId,
        project_id: projectId,
        type: type,
        commercial_status: commercialStatus,
        notes: notes,
        viber_screenshot_url: screenshotUri || null,
        created_at_local: now,
        is_offline_entry: true,
        device_id: deviceId,
        executed_by_id: activeActor,
        salesperson_id: repId,
        approved_by_id: null,
        created_at: now,
        updated_at: now,
        negotiated_price: negotiatedPrice,
        objection_reason: objectionReason,
        competitor_price: competitorPrice,
        viber_message_text: viberMessageText,
      };
      await tx.insert(sqliteSchema.interaction_logs).values(incomingLog);

      // Insert Interaction Items (with conversions, bypassing stock subtraction)
      for (const selected of selectedItems) {
        const newiiId = generateId();
        const selectedUnit = selected.selectedUnit || 'PCS';
        const multiplier = getConversionMultiplier(selected.item, selectedUnit);

        // Dynamically compute quantities in base units during insertion
        const baseQuantity = selected.quantity * multiplier;

        // Calculate base unit price at sale
        const negotiatedPrice =
          selected.unitPrice !== undefined
            ? selected.unitPrice
            : selected.item.unitPrice * multiplier;
        const baseUnitPriceAtSale = negotiatedPrice / multiplier;

        // Check if the price is >15% below wholesale floor
        const wholesaleFloor =
          selected.item.baseWholesalePrice !== undefined &&
          selected.item.baseWholesalePrice !== null
            ? selected.item.baseWholesalePrice
            : selected.item.unitPrice;
        const isBelowFloor = baseUnitPriceAtSale < wholesaleFloor * 0.85;
        const complianceStatus = isBelowFloor ? 'PENDING_APPROVAL' : 'APPROVED';

        await tx.insert(sqliteSchema.interaction_items).values({
          id: newiiId,
          interaction_log_id: newLogId,
          item_id: selected.item.id,
          quantity: baseQuantity,
          pending_allocation_count: selected.pendingAllocationCount || 0,
          unit_price_at_sale: baseUnitPriceAtSale,
          unit_price: selected.item.unitPrice,
          selected_currency: selected.selectedCurrency || 'MMK',
          selected_unit: selectedUnit,
          stock_condition: selected.stockCondition || 'GOOD',
          fulfillment_status: 'PENDING_FULFILLMENT',
          compliance_status: complianceStatus,
          created_at: now,
          updated_at: now,
        });
      }

      // Simultaneously commit a row to AuditEvents within this transaction
      await writeAuditEvent(tx, {
        event_id: `evt-${generateId()}`,
        trace_id: traceId || null,
        actor_id: activeActor,
        device_id: deviceId,
        entity_type: 'ORDER',
        action: 'CREATE',
        previous_state: null,
        new_state: JSON.stringify(incomingLog),
        gps_coordinates: null,
        created_at: now,
        shop_id: shopId,
        executed_by_id: activeActor,
        salesperson_id: repId,
        approved_by_id: null,
      });
    }),
  );

  if (error) {
    console.error('Database mutation failed in createInteractionLog:', error);
    throw error;
  }
  return newLogId;
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
  const itemsList = await database
    .select()
    .from(sqliteSchema.items)
    .where(isNull(sqliteSchema.items.deleted_at));
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

export const mapExpectedInbound = (ei: $Any): ExpectedInbound => ({
  id: ei.id,
  sku: ei.sku,
  expectedQuantity: ei.expected_quantity,
  origin: ei.origin,
  estimatedArrivalDate: ei.estimated_arrival_date,
  createdAt: ei.created_at,
  updatedAt: ei.updated_at,
});

export const fetchExpectedInbounds = async (): Promise<ExpectedInbound[]> => {
  const list = await database.select().from(sqliteSchema.expected_inbounds);
  return list.map(mapExpectedInbound);
};
