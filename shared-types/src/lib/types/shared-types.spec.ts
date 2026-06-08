import {
  RegionRecord,
  ShopRecord,
  ContactRecord,
  ItemRecord,
  InteractionLogRecord,
  InteractionItemRecord,
  DailyQuotaRecord,
  WatermelonChangeSet,
  INTERACTION_TYPES,
  COMMERCIAL_STATUSES,
  SENTIMENT_TRENDS,
  guardAsync,
} from './shared-types';
import { semanticSearch } from '../ai/semanticSearch';

describe('shared-types', () => {
  describe('Domain constants', () => {
    it('INTERACTION_TYPES has expected values', () => {
      expect(INTERACTION_TYPES).toContain('PHONE_CALL');
      expect(INTERACTION_TYPES).toContain('VIBER');
      expect(INTERACTION_TYPES).toContain('SHOP_VISIT');
    });

    it('COMMERCIAL_STATUSES has expected values', () => {
      expect(COMMERCIAL_STATUSES).toContain('ORDER_PLACED');
      expect(COMMERCIAL_STATUSES).toContain('NOT_INTERESTED');
    });

    it('SENTIMENT_TRENDS has expected values', () => {
      expect(SENTIMENT_TRENDS).toEqual(['IMPROVING', 'STABLE', 'DECLINING']);
    });
  });

  describe('Record types', () => {
    it('RegionRecord has correct shape', () => {
      const record: RegionRecord = {
        id: 'reg-1',
        name: 'Yangon',
        division: 'Yangon Div',
        created_at: 10000,
        updated_at: 10000,
      };
      expect(record.id).toBe('reg-1');
      expect(record.name).toBe('Yangon');
    });

    it('ShopRecord supports nullable GPS coords', () => {
      const record: ShopRecord = {
        id: 's-1',
        name: 'Test Shop',
        address: '123 St',
        latitude: null,
        longitude: null,
        region_id: 'reg-1',
        assigned_rep_id: null,
        lifetime_value: 0,
        sentiment_trend: 'STABLE',
        price_book_id: null,
        price_tier: 'Retailer',
        credit_limit_mmk: 0,
        created_at: 10000,
        updated_at: 10000,
      };
      expect(record.latitude).toBeNull();
    });

    it('ContactRecord has primary flag', () => {
      const record: ContactRecord = {
        id: 'c-1',
        shop_id: 's-1',
        name: 'U Kyaw',
        phone_number: '+959',
        email: null,
        is_primary: true,
        created_at: 10000,
        updated_at: 10000,
      };
      expect(record.is_primary).toBe(true);
    });

    it('ItemRecord has SKU and price', () => {
      const record: ItemRecord = {
        id: 'i-1',
        sku: 'SKU-PB-640',
        name: 'Premium Beer',
        unit_price: 2500,
        category: 'Beverage',
        brand_id: null,
        thickness: null,
        weight: null,
        unit_type: 'PCS',
        conversion_factor: 1,
        color: null,
        material_sub_type: null,
        hardware_finish: null,
        is_in_deficit: false,
        base_wholesale_price: 5.5,
        base_currency: 'USD',
        volume_discount_brackets: '[{"quantity": 10, "discount_percent": 5}]',
        inventory_status: 'AVAILABLE',
        created_at: 10000,
        updated_at: 10000,
      };
      expect(record.sku).toBe('SKU-PB-640');
      expect(record.base_wholesale_price).toBe(5.5);
      expect(record.base_currency).toBe('USD');
      expect(record.volume_discount_brackets).toContain('discount_percent');
    });

    it('InteractionLogRecord has all sync fields', () => {
      const record: InteractionLogRecord = {
        id: 'log-1',
        shop_id: 'shop-1',
        rep_id: 'rep-1',
        project_id: null,
        type: 'SHOP_VISIT',
        commercial_status: 'INTERESTED',
        notes: 'test',
        next_follow_up_date: null,
        viber_screenshot_url: null,
        created_at_local: 10000,
        synced_at_server: null,
        is_offline_entry: true,
        device_id: 'dev-1',
        executed_by_id: null,
        salesperson_id: null,
        approved_by_id: null,
        created_at: 10000,
        updated_at: 10000,
        negotiated_price: null,
        objection_reason: null,
        competitor_price: null,
        viber_message_text: null,
      };
      expect(record.type).toBe('SHOP_VISIT');
      expect(record.is_offline_entry).toBe(true);
    });

    it('InteractionItemRecord has price snapshot', () => {
      const record: InteractionItemRecord = {
        id: 'ii-1',
        interaction_log_id: 'log-1',
        item_id: 'i-1',
        quantity: 5,
        unit_price_at_sale: 2400,
        interest_level: 'HIGH',
        unit_price: null,
        selected_currency: null,
        selected_unit: 'PCS',
        stock_condition: 'GOOD',
        pending_allocation_count: 0,
        fulfillment_status: 'PENDING_FULFILLMENT',
        compliance_status: 'APPROVED',
        created_at: 10000,
        updated_at: 10000,
      };
      expect(record.unit_price_at_sale).toBe(2400);
    });

    it('DailyQuotaRecord has target metrics', () => {
      const record: DailyQuotaRecord = {
        id: 'q-1',
        user_id: 'u-1',
        target_visits: 10,
        target_phone: 5,
        target_viber: 15,
        effective_from: 10000,
        created_at: 10000,
        updated_at: 10000,
      };
      expect(record.target_visits).toBe(10);
    });
  });

  describe('WatermelonChangeSet', () => {
    it('is correctly shaped', () => {
      const changeset: WatermelonChangeSet<string> = {
        created: ['a'],
        updated: ['b'],
        deleted: ['c'],
      };
      expect(changeset.created).toHaveLength(1);
      expect(changeset.deleted).toHaveLength(1);
    });

    it('supports empty sets', () => {
      const changeset: WatermelonChangeSet<RegionRecord> = {
        created: [],
        updated: [],
        deleted: [],
      };
      expect(changeset.created).toHaveLength(0);
    });
  });

  describe('guardAsync', () => {
    it('returns [data, null] on successful resolution', async () => {
      const promise = Promise.resolve('success_val');
      const [result, error] = await guardAsync(promise);
      expect(result).toBe('success_val');
      expect(error).toBeNull();
    });

    it('returns [null, error] on rejection', async () => {
      const mockError = new Error('failure_err');
      const promise = Promise.reject(mockError);
      const [result, error] = await guardAsync(promise);
      expect(result).toBeNull();
      expect(error).toBe(mockError);
    });
  });

  describe('SemanticSearchEngine', () => {
    const items = [
      { id: '1', name: 'Aluzinc Corrugated Sheets', sku: 'SKU-AZ-100' },
      { id: '2', name: 'Steel Roofing Sheets Green', sku: 'SKU-SR-200' },
      { id: '3', name: 'Premium Cement Bag 50kg', sku: 'SKU-CM-50' },
      { id: '4', name: 'PVC Pipe 2 inch', sku: 'SKU-PVCP-2' },
    ];

    it('matches exactly on SKU', () => {
      const results = semanticSearch(items, 'SKU-PVCP-2');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('4');
    });

    it('matches exactly on partial name', () => {
      const results = semanticSearch(items, 'Cement');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('3');
    });

    it('matches exactly on name', () => {
      const results = semanticSearch(items, 'Premium Cement Bag 50kg');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('3');
    });

    it('performs semantic matching with synonym expansion for "waterproof roofing"', () => {
      const results = semanticSearch(items, 'waterproof roofing');
      expect(results.length).toBeGreaterThanOrEqual(2);
      expect(results[0].name).toMatch(/zinc|roofing/i);
    });

    it('returns all items on empty query', () => {
      const results = semanticSearch(items, '');
      expect(results).toHaveLength(items.length);
    });

    it('uses indexed regex substring matching when thermal state is CRITICAL', () => {
      (globalThis as any).ThermalGuard = {
        getThermalState: () => 'CRITICAL',
      };

      const results = semanticSearch(items, 'Sheets');
      expect(results).toHaveLength(2); // Aluzinc Corrugated Sheets, Steel Roofing Sheets Green

      delete (globalThis as any).ThermalGuard;
    });

    it('limits comparison search space by 50% when thermal state is SERIOUS', () => {
      (globalThis as any).ThermalGuard = {
        getThermalState: () => 'SERIOUS',
      };

      // items array size is 4. Under SERIOUS state, searchItems is items.slice(0, 2).
      // So only "Aluzinc Corrugated Sheets" and "Steel Roofing Sheets Green" are searched.
      // Search for "pvc" which is index 3 (item 4). Under SERIOUS state, it won't be matched.
      const results = semanticSearch(items, 'pvc');
      expect(results).toHaveLength(0);

      // Search for "steel" which is index 1 (item 2). It is in the first 50%, so it should match.
      const results2 = semanticSearch(items, 'steel');
      expect(results2.length).toBeGreaterThan(0);

      delete (globalThis as any).ThermalGuard;
    });
  });
});
