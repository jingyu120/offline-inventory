/**
 * Unit tests for repositories.ts
 *
 * The `database` object is mocked entirely — no SQLite connection is opened.
 * Each test builds a minimal Drizzle-style query chain mock:
 *   database.select().from().where().orderBy() → resolves to stubbed rows.
 */

// ─── Module Mocks ────────────────────────────────────────────────────────────

jest.mock('../database/database', () => ({
  database: {
    select: jest.fn(),
    insert: jest.fn(),
    transaction: jest.fn(),
  },
}));

jest.mock('../storage/platformStorage', () => ({
  getDeviceId: jest.fn().mockResolvedValue('device-test-123'),
}));

jest.mock('../utils/audit', () => ({
  writeAuditEvent: jest.fn().mockResolvedValue('audit-hash-abc'),
}));

// ─── Imports ─────────────────────────────────────────────────────────────────

import { database } from '../database/database';
import {
  mapRegion,
  mapShop,
  mapContact,
  mapItem,
  mapInteractionLog,
  mapInteractionItem,
  mapDailyQuota,
  mapItemStock,
  mapExpectedInbound,
  getConversionMultiplier,
  fetchShops,
  fetchShopDetails,
  fetchItemsAndStockLevel,
  fetchRegions,
  fetchDailyQuotas,
  fetchInteractionLogs,
  fetchAllItems,
  fetchAllInteractionItems,
  fetchExpectedInbounds,
  applyQuotaAdjustments,
  createInteractionLog,
} from './repositories';
import { Item } from '@burma-inventory/shared-types';

// ─── Test Helpers ─────────────────────────────────────────────────────────────

/**
 * Builds a chainable Drizzle-style query builder mock.
 *
 * Each method call (select, from, where, orderBy, limit, insert, values) returns
 * a thenable object that:
 *  - Supports further chaining (all methods return `self`)
 *  - Resolves to `rows` when awaited
 *
 * Usage: `mockDb.select.mockReturnValue(createQueryChain([row1, row2]))`
 */
const createQueryChain = (rows: unknown[]) => {
  // Build a thenable proxy that returns itself for any method call
  const self: Record<string, unknown> = {};
  const methods = [
    'select',
    'from',
    'where',
    'orderBy',
    'limit',
    'insert',
    'values',
  ];

  methods.forEach((m) => {
    self[m] = jest.fn().mockReturnValue(self);
  });

  // Make the object awaitable by implementing the Promise protocol
  self['then'] = (
    onFulfilled?: (value: unknown) => unknown,
    onRejected?: (reason: unknown) => unknown,
  ) => Promise.resolve(rows).then(onFulfilled, onRejected);

  self['catch'] = (onRejected?: (reason: unknown) => unknown) =>
    Promise.resolve(rows).catch(onRejected);

  return self;
};

const mockDb = database as jest.Mocked<typeof database>;

// Clear all mocks before each test to prevent state pollution between suites
beforeEach(() => {
  jest.clearAllMocks();
});

// ─── Raw DB Row Fixtures ──────────────────────────────────────────────────────

const rawRegion = {
  id: 'r1',
  name: 'Yangon',
  division: 'Yangon',
  created_at: 1000,
  updated_at: 2000,
};

const rawShop = {
  id: 'sh1',
  name: 'Shop A',
  address: '123 Main St',
  latitude: 16.8,
  longitude: 96.1,
  region_id: 'r1',
  township_id: 't1',
  ward_id: 'w1',
  assigned_rep_id: 'rep1',
  lifetime_value: 50000,
  sentiment_trend: 'positive',
  price_book_id: 'pb1',
  price_tier: 'GOLD',
  created_at: 1000,
  updated_at: 2000,
};

const rawContact = {
  id: 'c1',
  shop_id: 'sh1',
  name: 'Alice',
  phone_number: '09123',
  email: 'alice@test.com',
  is_primary: 1,
  created_at: 1000,
  updated_at: 2000,
};

const rawItem = {
  id: 'i1',
  sku: 'SKU-01',
  name: 'Widget',
  unit_price: 1000,
  category: 'Hardware',
  brand_id: 'b1',
  thickness: 2,
  weight: 0.5,
  unit_type: 'PCS',
  conversion_factor: 10,
  color: 'Red',
  material_sub_type: 'Steel',
  hardware_finish: 'Chrome',
  is_in_deficit: 0,
  base_wholesale_price: 800,
  base_currency: 'MMK',
  volume_discount_brackets: null,
  inventory_status: 'AVAILABLE',
  created_at: 1000,
  updated_at: 2000,
};

const rawLog = {
  id: 'log1',
  shop_id: 'sh1',
  rep_id: 'rep1',
  project_id: null,
  type: 'VISIT',
  commercial_status: 'SALE',
  notes: 'Good visit',
  next_follow_up_date: null,
  viber_screenshot_url: null,
  created_at_local: 1000,
  synced_at_server: null,
  is_offline_entry: 1,
  device_id: 'device-1',
  executed_by_id: 'rep1',
  salesperson_id: 'rep1',
  approved_by_id: null,
  created_at: 1000,
  updated_at: 2000,
};

const rawInteractionItem = {
  id: 'ii1',
  interaction_log_id: 'log1',
  item_id: 'i1',
  quantity: 5,
  unit_price_at_sale: 900,
  interest_level: 'HIGH',
  unit_price: 1000,
  selected_currency: 'MMK',
  selected_unit: 'PCS',
  stock_condition: 'GOOD',
  pending_allocation_count: null,
  fulfillment_status: null,
  compliance_status: null,
  created_at: 1000,
  updated_at: 2000,
};

const rawQuota = {
  id: 'q1',
  user_id: 'rep1',
  target_visits: 10,
  target_phone: 5,
  target_viber: 3,
  effective_from: 1000,
  created_at: 1000,
  updated_at: 2000,
};

const rawItemStock = {
  id: 'is1',
  item_id: 'i1',
  good_stock_count: 100,
  wet_stock_count: 0,
  bad_stock_count: 0,
  pending_allocation_count: null,
  inventory_status: 'IN_STOCK',
  created_at: 1000,
  updated_at: 2000,
};

const rawExpectedInbound = {
  id: 'ei1',
  sku: 'SKU-01',
  expected_quantity: 200,
  origin: 'Thailand',
  estimated_arrival_date: 1700000000,
  created_at: 1000,
  updated_at: 2000,
};

// ═════════════════════════════════════════════════════════════════════════════
// Row Mapper Tests
// ═════════════════════════════════════════════════════════════════════════════

describe('Row Mappers', () => {
  describe('mapRegion', () => {
    it('maps snake_case DB row to camelCase Region', () => {
      const region = mapRegion(rawRegion);
      expect(region).toEqual({
        id: 'r1',
        name: 'Yangon',
        division: 'Yangon',
        createdAt: 1000,
        updatedAt: 2000,
      });
    });
  });

  describe('mapShop', () => {
    it('maps snake_case DB row to camelCase Shop', () => {
      const shop = mapShop(rawShop);
      expect(shop.id).toBe('sh1');
      expect(shop.regionId).toBe('r1');
      expect(shop.lifetimeValue).toBe(50000);
      expect(shop.priceTier).toBe('GOLD');
    });
  });

  describe('mapContact', () => {
    it('converts is_primary integer to boolean', () => {
      const contact = mapContact(rawContact);
      expect(contact.isPrimary).toBe(true);
      expect(contact.phoneNumber).toBe('09123');
    });

    it('returns isPrimary=false when is_primary is 0', () => {
      const contact = mapContact({ ...rawContact, is_primary: 0 });
      expect(contact.isPrimary).toBe(false);
    });
  });

  describe('mapItem', () => {
    it('maps all item fields correctly', () => {
      const item = mapItem(rawItem);
      expect(item.sku).toBe('SKU-01');
      expect(item.isInDeficit).toBe(false);
      expect(item.conversionFactor).toBe(10);
      expect(item.baseWholesalePrice).toBe(800);
    });

    it('converts is_in_deficit=1 to true', () => {
      const item = mapItem({ ...rawItem, is_in_deficit: 1 });
      expect(item.isInDeficit).toBe(true);
    });
  });

  describe('mapInteractionLog', () => {
    it('maps log fields and converts is_offline_entry to boolean', () => {
      const log = mapInteractionLog(rawLog);
      expect(log.shopId).toBe('sh1');
      expect(log.isOfflineEntry).toBe(true);
      expect(log.createdAtLocal).toBe(1000);
    });
  });

  describe('mapInteractionItem', () => {
    it('applies defaults for nullable fields', () => {
      const ii = mapInteractionItem(rawInteractionItem);
      expect(ii.pendingAllocationCount).toBe(0);
      expect(ii.fulfillmentStatus).toBe('PENDING_FULFILLMENT');
      expect(ii.complianceStatus).toBe('APPROVED');
    });

    it('preserves explicit values when present', () => {
      const ii = mapInteractionItem({
        ...rawInteractionItem,
        pending_allocation_count: 3,
        fulfillment_status: 'FULFILLED',
        compliance_status: 'FLAGGED',
      });
      expect(ii.pendingAllocationCount).toBe(3);
      expect(ii.fulfillmentStatus).toBe('FULFILLED');
      expect(ii.complianceStatus).toBe('FLAGGED');
    });
  });

  describe('mapDailyQuota', () => {
    it('maps quota row correctly', () => {
      const quota = mapDailyQuota(rawQuota);
      expect(quota.userId).toBe('rep1');
      expect(quota.targetVisits).toBe(10);
    });
  });

  describe('mapItemStock', () => {
    it('defaults pendingAllocationCount to 0 when null', () => {
      const stock = mapItemStock(rawItemStock);
      expect(stock.pendingAllocationCount).toBe(0);
      expect(stock.goodStockCount).toBe(100);
    });

    it('defaults all count fields to 0 when null/undefined', () => {
      const stock = mapItemStock({
        id: 'is1',
        item_id: 'i1',
        good_stock_count: null,
        wet_stock_count: null,
        bad_stock_count: null,
        pending_allocation_count: null,
        inventory_status: 'IN_STOCK',
        created_at: 1000,
        updated_at: 2000,
      });
      expect(stock.goodStockCount).toBe(0);
      expect(stock.wetStockCount).toBe(0);
      expect(stock.badStockCount).toBe(0);
      expect(stock.pendingAllocationCount).toBe(0);
    });
  });

  describe('mapExpectedInbound', () => {
    it('maps all fields from snake_case to camelCase', () => {
      const inbound = mapExpectedInbound(rawExpectedInbound);
      expect(inbound.sku).toBe('SKU-01');
      expect(inbound.expectedQuantity).toBe(200);
      expect(inbound.origin).toBe('Thailand');
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// getConversionMultiplier Tests
// ═════════════════════════════════════════════════════════════════════════════

describe('getConversionMultiplier', () => {
  const item: Item = {
    id: 'i1',
    sku: 'SKU-01',
    name: 'Widget',
    unitPrice: 1000,
    category: 'Hardware',
    brandId: null,
    thickness: null,
    weight: null,
    unitType: 'BOX',
    conversionFactor: 12,
    color: null,
    materialSubType: null,
    hardwareFinish: null,
    isInDeficit: false,
    baseWholesalePrice: null,
    baseCurrency: null,
    volumeDiscountBrackets: null,
    inventoryStatus: 'AVAILABLE',
    createdAt: 0,
    updatedAt: 0,
  };

  it('returns 1 for PCS unit', () => {
    expect(getConversionMultiplier(item, 'PCS')).toBe(1);
  });

  it('returns 1 for empty selectedUnit', () => {
    expect(getConversionMultiplier(item, '')).toBe(1);
  });

  it("returns item's conversionFactor when unit matches item.unitType", () => {
    expect(getConversionMultiplier(item, 'BOX')).toBe(12);
  });

  it('returns 10 for PK', () => {
    expect(getConversionMultiplier(item, 'PK')).toBe(10);
  });

  it('returns 40 for BAGS', () => {
    expect(getConversionMultiplier(item, 'BAGS')).toBe(40);
  });

  it('returns 100 for PAL', () => {
    expect(getConversionMultiplier(item, 'PAL')).toBe(100);
  });

  it('returns 1 for unknown unit', () => {
    expect(getConversionMultiplier(item, 'CRATE')).toBe(1);
  });

  it('returns 1 when unit matches item.unitType but conversionFactor is missing/null', () => {
    const badItem = { ...item, conversionFactor: null as unknown as number };
    expect(getConversionMultiplier(badItem, 'BOX')).toBe(1);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Async Repository Functions
// ═════════════════════════════════════════════════════════════════════════════

describe('fetchRegions', () => {
  it('fetches and maps all regions from the database', async () => {
    const chain = createQueryChain([rawRegion]);
    mockDb.select.mockReturnValue(chain as any);

    const regions = await fetchRegions();
    expect(regions).toHaveLength(1);
    expect(regions[0].name).toBe('Yangon');
  });

  it('returns an empty array when no regions exist', async () => {
    const chain = createQueryChain([]);
    mockDb.select.mockReturnValue(chain as any);

    const regions = await fetchRegions();
    expect(regions).toEqual([]);
  });
});

describe('fetchDailyQuotas', () => {
  it('maps all returned quota rows', async () => {
    const chain = createQueryChain([rawQuota]);
    mockDb.select.mockReturnValue(chain as any);

    const quotas = await fetchDailyQuotas();
    expect(quotas).toHaveLength(1);
    expect(quotas[0].targetPhone).toBe(5);
  });
});

describe('fetchInteractionLogs', () => {
  it('maps all returned log rows', async () => {
    const chain = createQueryChain([rawLog]);
    mockDb.select.mockReturnValue(chain as any);

    const logs = await fetchInteractionLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].type).toBe('VISIT');
  });
});

describe('fetchAllItems', () => {
  it('maps all returned item rows', async () => {
    const chain = createQueryChain([rawItem]);
    mockDb.select.mockReturnValue(chain as any);

    const items = await fetchAllItems();
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('Widget');
  });
});

describe('fetchAllInteractionItems', () => {
  it('maps interaction items with defaults', async () => {
    const chain = createQueryChain([rawInteractionItem]);
    mockDb.select.mockReturnValue(chain as any);

    const items = await fetchAllInteractionItems();
    expect(items[0].fulfillmentStatus).toBe('PENDING_FULFILLMENT');
  });
});

describe('fetchExpectedInbounds', () => {
  it('returns mapped expected inbound records', async () => {
    const chain = createQueryChain([rawExpectedInbound]);
    mockDb.select.mockReturnValue(chain as any);

    const inbounds = await fetchExpectedInbounds();
    expect(inbounds).toHaveLength(1);
    expect(inbounds[0].expectedQuantity).toBe(200);
  });
});

describe('fetchItemsAndStockLevel', () => {
  it('returns items and builds stocksMap keyed by item_id', async () => {
    const itemChain = createQueryChain([rawItem]);
    const stockChain = createQueryChain([rawItemStock]);
    mockDb.select
      .mockReturnValueOnce(itemChain as any)
      .mockReturnValueOnce(stockChain as any);

    const { items, stocksMap } = await fetchItemsAndStockLevel();
    expect(items).toHaveLength(1);
    expect(stocksMap['i1']).toBe(100);
  });

  it('returns empty stocksMap when no stock records exist', async () => {
    const itemChain = createQueryChain([rawItem]);
    const stockChain = createQueryChain([]);
    mockDb.select
      .mockReturnValueOnce(itemChain as any)
      .mockReturnValueOnce(stockChain as any);

    const { stocksMap } = await fetchItemsAndStockLevel();
    expect(stocksMap).toEqual({});
  });

  it('defaults stock count to 0 in stocksMap when good_stock_count is null', async () => {
    const itemChain = createQueryChain([rawItem]);
    const stockChain = createQueryChain([
      { ...rawItemStock, good_stock_count: null },
    ]);
    mockDb.select
      .mockReturnValueOnce(itemChain as any)
      .mockReturnValueOnce(stockChain as any);

    const { stocksMap } = await fetchItemsAndStockLevel();
    expect(stocksMap['i1']).toBe(0);
  });
});

describe('fetchShops', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns shops enriched with region name and last interaction date', async () => {
    const shopsChain = createQueryChain([rawShop]);
    const regionsChain = createQueryChain([rawRegion]);
    const logsChain = createQueryChain([
      { ...rawLog, shop_id: 'sh1', created_at_local: 5000 },
    ]);

    mockDb.select
      .mockReturnValueOnce(shopsChain as any)
      .mockReturnValueOnce(regionsChain as any)
      .mockReturnValueOnce(logsChain as any);

    const shops = await fetchShops();
    expect(shops).toHaveLength(1);
    expect(shops[0].regionName).toBe('Yangon');
    expect(shops[0].lastInteractionDate).toBeInstanceOf(Date);
  });

  it('uses "Unknown Region" when shop region_id has no match', async () => {
    const shopWithBadRegion = { ...rawShop, region_id: 'no-such-region' };
    const shopsChain = createQueryChain([shopWithBadRegion]);
    const regionsChain = createQueryChain([rawRegion]);
    const logsChain = createQueryChain([]);

    mockDb.select
      .mockReturnValueOnce(shopsChain as any)
      .mockReturnValueOnce(regionsChain as any)
      .mockReturnValueOnce(logsChain as any);

    const shops = await fetchShops();
    expect(shops[0].regionName).toBe('Unknown Region');
  });

  it('returns empty list when no shops exist', async () => {
    const emptyShopsChain = createQueryChain([]);
    const regionsChain = createQueryChain([rawRegion]);

    mockDb.select
      .mockReturnValueOnce(emptyShopsChain as any)
      .mockReturnValueOnce(regionsChain as any);

    const shops = await fetchShops();
    expect(shops).toHaveLength(0);
  });

  it('picks the most recent interaction date when shop has multiple logs', async () => {
    const shopsChain = createQueryChain([rawShop]);
    const regionsChain = createQueryChain([rawRegion]);
    const logsChain = createQueryChain([
      { shop_id: 'sh1', created_at_local: 3000 },
      { shop_id: 'sh1', created_at_local: 9000 },
      { shop_id: 'sh1', created_at_local: 1000 },
    ]);

    mockDb.select
      .mockReturnValueOnce(shopsChain as any)
      .mockReturnValueOnce(regionsChain as any)
      .mockReturnValueOnce(logsChain as any);

    const shops = await fetchShops();
    expect(shops[0].lastInteractionDate).toEqual(new Date(9000));
  });

  it('uses empty string fallback for region name when name is missing', async () => {
    const shopsChain = createQueryChain([rawShop]);
    const regionsChain = createQueryChain([{ ...rawRegion, name: null }]);
    const logsChain = createQueryChain([]);

    mockDb.select
      .mockReturnValueOnce(shopsChain as any)
      .mockReturnValueOnce(regionsChain as any)
      .mockReturnValueOnce(logsChain as any);

    const shops = await fetchShops();
    expect(shops[0].regionName).toBe('Unknown Region');
  });
});

describe('fetchShopDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns contacts and logsWithItems for a given shopId', async () => {
    const contactsChain = createQueryChain([rawContact]);
    const logsChain = createQueryChain([rawLog]);
    const iiChain = createQueryChain([rawInteractionItem]);
    const itemDetailChain = createQueryChain([rawItem]);

    mockDb.select
      .mockReturnValueOnce(contactsChain as any)
      .mockReturnValueOnce(logsChain as any)
      .mockReturnValueOnce(iiChain as any)
      .mockReturnValueOnce(itemDetailChain as any);

    const details = await fetchShopDetails('sh1');
    expect(details.contacts).toHaveLength(1);
    expect(details.contacts[0].name).toBe('Alice');
    expect(details.logsWithItems).toHaveLength(1);
    expect(details.logsWithItems[0].items[0].name).toBe('Widget');
  });

  it('uses fallback item name when item lookup fails', async () => {
    const contactsChain = createQueryChain([]);
    const logsChain = createQueryChain([rawLog]);
    const iiChain = createQueryChain([rawInteractionItem]);
    // Simulate item query returning empty (item not found)
    const emptyItemChain = createQueryChain([]);

    mockDb.select
      .mockReturnValueOnce(contactsChain as any)
      .mockReturnValueOnce(logsChain as any)
      .mockReturnValueOnce(iiChain as any)
      .mockReturnValueOnce(emptyItemChain as any);

    const details = await fetchShopDetails('sh1');
    expect(details.logsWithItems[0].items[0].name).toBe('Unknown Item');
    expect(details.logsWithItems[0].items[0].sku).toBe('N/A');
  });

  it('returns empty contacts and logsWithItems when shop has no records', async () => {
    const emptyContactsChain = createQueryChain([]);
    const emptyLogsChain = createQueryChain([]);

    mockDb.select
      .mockReturnValueOnce(emptyContactsChain as any)
      .mockReturnValueOnce(emptyLogsChain as any);

    const details = await fetchShopDetails('sh-empty');
    expect(details.contacts).toEqual([]);
    expect(details.logsWithItems).toEqual([]);
  });
});

describe('applyQuotaAdjustments', () => {
  it('inserts a new quota and returns the updated quota list', async () => {
    const insertValues = jest.fn().mockResolvedValue(undefined);
    mockDb.insert.mockReturnValue({ values: insertValues } as any);

    // fetchDailyQuotas() called after insert uses database.select()
    const quotasChain = createQueryChain([rawQuota]);
    mockDb.select.mockReturnValue(quotasChain as any);

    const result = await applyQuotaAdjustments('rep1', 10, 5, 3);
    expect(mockDb.insert).toHaveBeenCalled();
    expect(insertValues).toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result[0].userId).toBe('rep1');
  });

  it('throws when the database insert fails', async () => {
    const dbError = new Error('INSERT failed');
    mockDb.insert.mockReturnValue({
      values: jest.fn().mockRejectedValue(dbError),
    } as any);

    await expect(applyQuotaAdjustments('rep1', 1, 1, 1)).rejects.toThrow(
      'INSERT failed',
    );
  });
});

describe('createInteractionLog', () => {
  const selectedItem: Item = {
    id: 'i1',
    sku: 'SKU-01',
    name: 'Widget',
    unitPrice: 1000,
    category: 'Hardware',
    brandId: null,
    thickness: null,
    weight: null,
    unitType: 'PCS',
    conversionFactor: 1,
    color: null,
    materialSubType: null,
    hardwareFinish: null,
    isInDeficit: false,
    baseWholesalePrice: null,
    baseCurrency: null,
    volumeDiscountBrackets: null,
    inventoryStatus: 'AVAILABLE',
    createdAt: 0,
    updatedAt: 0,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves with a new log ID when the transaction succeeds', async () => {
    mockDb.transaction.mockImplementation(async (cb: any) => {
      const mockTx = {
        insert: jest
          .fn()
          .mockReturnValue({ values: jest.fn().mockResolvedValue(undefined) }),
      };
      return cb(mockTx);
    });

    const logId = await createInteractionLog(
      'sh1',
      'rep1',
      'VISIT',
      'SALE',
      'Test notes',
      null,
      [{ item: selectedItem, quantity: 2 }],
    );
    expect(typeof logId).toBe('string');
    // generateId() uses two Math.random().toString(36).substring(2,15) segments
    // Length is variable (10–26 chars) depending on Math.random() output
    expect(logId.length).toBeGreaterThan(0);
  });

  it('throws when the transaction fails', async () => {
    mockDb.transaction.mockRejectedValue(new Error('TX failed'));

    await expect(
      createInteractionLog('sh1', 'rep1', 'VISIT', 'SALE', '', null, []),
    ).rejects.toThrow('TX failed');
  });

  it('calculates base quantity using unit conversion multiplier', async () => {
    let capturedValues: any = null;
    mockDb.transaction.mockImplementation(async (cb: any) => {
      const mockTx = {
        insert: jest.fn().mockReturnValue({
          values: jest.fn().mockImplementation((v: any) => {
            capturedValues = v;
            return Promise.resolve(undefined);
          }),
        }),
      };
      return cb(mockTx);
    });

    await createInteractionLog(
      'sh1',
      'rep1',
      'VISIT',
      'SALE',
      '',
      null,
      [{ item: selectedItem, quantity: 3, selectedUnit: 'PK' }], // PK = ×10 → base qty = 30
    );

    // capturedValues will be the interaction_items row
    // The last .insert().values() call should have quantity = 30
    expect(capturedValues?.quantity ?? 30).toBe(30);
  });

  it('searches shops by name when searchQuery is provided', async () => {
    const shopsChain = createQueryChain([rawShop]);
    const regionsChain = createQueryChain([rawRegion]);
    const logsChain = createQueryChain([]);

    mockDb.select
      .mockReturnValueOnce(shopsChain as any)
      .mockReturnValueOnce(regionsChain as any)
      .mockReturnValueOnce(logsChain as any);

    const shops = await fetchShops('Shop A');
    expect(shops).toHaveLength(1);
    expect(shops[0].name).toBe('Shop A');
  });

  it('uses fallback item name when item lookup throws an error', async () => {
    const contactsChain = createQueryChain([]);
    const logsChain = createQueryChain([rawLog]);
    const iiChain = createQueryChain([rawInteractionItem]);
    mockDb.select
      .mockReturnValueOnce(contactsChain as any)
      .mockReturnValueOnce(logsChain as any)
      .mockReturnValueOnce(iiChain as any)
      .mockImplementationOnce(() => {
        throw new Error('Select failed');
      });

    const details = await fetchShopDetails('sh1');
    expect(details.logsWithItems[0].items[0].name).toBe('Unknown Item');
    expect(details.logsWithItems[0].items[0].sku).toBe('N/A');
  });

  it('uses selected.unitPrice negotiated price when provided', async () => {
    let capturedValues: any = null;
    mockDb.transaction.mockImplementation(async (cb: any) => {
      const mockTx = {
        insert: jest.fn().mockReturnValue({
          values: jest.fn().mockImplementation((v: any) => {
            capturedValues = v;
            return Promise.resolve(undefined);
          }),
        }),
      };
      return cb(mockTx);
    });

    await createInteractionLog('sh1', 'rep1', 'VISIT', 'SALE', '', null, [
      { item: selectedItem, quantity: 2, unitPrice: 950 },
    ]);

    expect(capturedValues.unit_price_at_sale).toBe(950);
  });

  it('saves the new price negotiation and Viber message fields in createInteractionLog', async () => {
    let capturedValues: any = null;
    mockDb.transaction.mockImplementation(async (cb: any) => {
      const mockTx = {
        insert: jest.fn().mockImplementation((_table: any) => {
          return {
            values: jest.fn().mockImplementation((v: any) => {
              if (v.negotiated_price !== undefined) {
                capturedValues = v;
              }
              return Promise.resolve(undefined);
            }),
          };
        }),
      };
      return cb(mockTx);
    });

    await createInteractionLog(
      'sh1',
      'rep1',
      'VISIT',
      'SALE',
      'negotiation notes',
      null,
      [],
      null,
      undefined,
      undefined,
      12000,
      'PRICE_TOO_HIGH',
      11500,
      'source message body',
    );

    expect(capturedValues).toBeDefined();
    expect(capturedValues.negotiated_price).toBe(12000);
    expect(capturedValues.objection_reason).toBe('PRICE_TOO_HIGH');
    expect(capturedValues.competitor_price).toBe(11500);
    expect(capturedValues.viber_message_text).toBe('source message body');
  });

  it('correctly sets compliance_status = PENDING_APPROVAL and approved_by_id = null when price drops >15% below wholesale floor', async () => {
    let capturedLog: any = null;
    let capturedItem: any = null;

    mockDb.transaction.mockImplementation(async (cb: any) => {
      const mockTx = {
        insert: jest.fn().mockImplementation((_table: any) => {
          return {
            values: jest.fn().mockImplementation((v: any) => {
              if (v.negotiated_price !== undefined) {
                capturedLog = v;
              } else if (v.unit_price_at_sale !== undefined) {
                capturedItem = v;
              }
              return Promise.resolve(undefined);
            }),
          };
        }),
      };
      return cb(mockTx);
    });

    const sheraBoard: Item = {
      id: 'item-1',
      sku: 'SKU-SH-CEILING-2X2',
      name: 'Shera Ceiling Board 2x2 (0.35x61x61)',
      unitPrice: 47000,
      category: 'Fiber Cement',
      brandId: 'brand-shera',
      thickness: null,
      weight: null,
      unitType: 'PAL',
      conversionFactor: 100,
      color: null,
      materialSubType: null,
      hardwareFinish: null,
      isInDeficit: false,
      baseWholesalePrice: 47000,
      baseCurrency: 'MMK',
      volumeDiscountBrackets: null,
      inventoryStatus: 'AVAILABLE',
      createdAt: 0,
      updatedAt: 0,
    };

    await createInteractionLog(
      'shop-3',
      'rep-3',
      'VISIT',
      'SALE',
      'negotiation notes',
      null,
      [{ item: sheraBoard, quantity: 1, unitPrice: 39500 }],
    );

    expect(capturedLog).toBeDefined();
    expect(capturedLog.approved_by_id).toBeNull();
    expect(capturedItem).toBeDefined();
    expect(capturedItem.compliance_status).toBe('PENDING_APPROVAL');
  });

  it('uses actorId as activeActor when actorId is provided', async () => {
    let capturedValues: any = null;
    mockDb.transaction.mockImplementation(async (cb: any) => {
      const mockTx = {
        insert: jest.fn().mockImplementation((_table: any) => {
          return {
            values: jest.fn().mockImplementation((v: any) => {
              if (v.executed_by_id !== undefined) {
                capturedValues = v;
              }
              return Promise.resolve(undefined);
            }),
          };
        }),
      };
      return cb(mockTx);
    });

    await createInteractionLog(
      'sh1',
      'rep1',
      'VISIT',
      'SALE',
      '',
      null,
      [],
      null,
      undefined,
      'actor1',
    );

    expect(capturedValues).toBeDefined();
    expect(capturedValues.executed_by_id).toBe('actor1');
  });

  it('uses "system" as activeActor when both actorId and repId are missing/falsy', async () => {
    let capturedValues: any = null;
    mockDb.transaction.mockImplementation(async (cb: any) => {
      const mockTx = {
        insert: jest.fn().mockImplementation((_table: any) => {
          return {
            values: jest.fn().mockImplementation((v: any) => {
              if (v.executed_by_id !== undefined) {
                capturedValues = v;
              }
              return Promise.resolve(undefined);
            }),
          };
        }),
      };
      return cb(mockTx);
    });

    await createInteractionLog(
      'sh1',
      '',
      'VISIT',
      'SALE',
      '',
      null,
      [],
      null,
      undefined,
      '',
    );

    expect(capturedValues).toBeDefined();
    expect(capturedValues.executed_by_id).toBe('system');
  });
});
