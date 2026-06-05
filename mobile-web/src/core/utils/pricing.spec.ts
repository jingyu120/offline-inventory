/**
 * Unit tests for the pricing utility.
 *
 * Covers MMK base prices, price book overrides, and multi-currency
 * conversion via exchange rates and defaultRateToMmk fallbacks.
 */
import { getItemPrice } from './pricing';
import { Item } from '@burma-inventory/shared-types';

describe('getItemPrice', () => {
  const baseItem: Item = {
    id: 'item-1',
    sku: 'SKU-1',
    name: 'Test Item',
    unitPrice: 1000,
    category: 'Test',
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

  describe('Base MMK pricing', () => {
    it('returns unitPrice when currency is MMK and no overrides exist', () => {
      expect(getItemPrice(baseItem, [], 'MMK', [])).toBe(1000);
    });

    it('returns baseWholesalePrice directly when baseCurrency matches selectedCurrency', () => {
      const item: Item = {
        ...baseItem,
        baseWholesalePrice: 5,
        baseCurrency: 'USD',
      };
      expect(getItemPrice(item, [], 'USD', [])).toBe(5);
    });
  });

  describe('Price book overrides', () => {
    it('applies price book override price in MMK', () => {
      const pbItems = [{ item_id: 'item-1', price: 900, currency: 'MMK' }];
      expect(getItemPrice(baseItem, pbItems, 'MMK', [])).toBe(900);
    });

    it('applies price book override with currency match', () => {
      const pbItems = [{ item_id: 'item-1', price: 3, currency: 'USD' }];
      expect(getItemPrice(baseItem, pbItems, 'USD', [])).toBe(3);
    });

    it('ignores price book overrides for other item IDs', () => {
      const pbItems = [{ item_id: 'other-item', price: 500, currency: 'MMK' }];
      expect(getItemPrice(baseItem, pbItems, 'MMK', [])).toBe(1000);
    });
  });

  describe('Exchange rate conversion', () => {
    it('converts USD base price to MMK using exchange rates', () => {
      const item: Item = {
        ...baseItem,
        baseWholesalePrice: 2,
        baseCurrency: 'USD',
      };
      const rates = [{ from_currency: 'USD', to_currency: 'MMK', rate: 4000 }];
      expect(getItemPrice(item, [], 'MMK', rates)).toBe(8000);
    });

    it('converts from MMK to a target currency using exchange rates', () => {
      // basePrice is 2000 MMK; rate says 1 THB = 58.5 MMK → 2000/58.5 ≈ 34.18
      const item: Item = {
        ...baseItem,
        unitPrice: 2000,
        baseWholesalePrice: null,
      };
      const rates = [{ from_currency: 'THB', to_currency: 'MMK', rate: 58.5 }];
      const price = getItemPrice(item, [], 'THB', rates);
      expect(price).toBeCloseTo(2000 / 58.5, 2);
    });

    it('falls back to defaultRateToMmk when no exchange rate is available for target currency', () => {
      // appConfig CURRENCIES has USD defaultRateToMmk = 2100
      // basePrice = 1000 MMK (baseCurrency = MMK), selectedCurrency = USD
      // Expected: 1000 / 2100 ≈ 0.476
      const price = getItemPrice(baseItem, [], 'USD', []);
      expect(price).toBeCloseTo(1000 / 2100, 3);
    });

    it('falls back to defaultRateToMmk for THB when no exchange rate is available', () => {
      // appConfig CURRENCIES has THB defaultRateToMmk = 58.5
      const price = getItemPrice(baseItem, [], 'THB', []);
      expect(price).toBeCloseTo(1000 / 58.5, 3);
    });

    it('converts baseCurrency to MMK using currency match in rates list', () => {
      const item: Item = {
        ...baseItem,
        baseWholesalePrice: 2,
        baseCurrency: 'USD',
      };
      const rates = [{ currency: 'USD', rate_to_kyat: 4100 }];
      expect(getItemPrice(item, [], 'MMK', rates)).toBe(8200);
    });

    it('converts MMK to target currency using currency match rate_to_kyat in rates list', () => {
      const rates = [{ currency: 'USD', rate_to_kyat: 4100 }];
      expect(getItemPrice(baseItem, [], 'USD', rates)).toBeCloseTo(
        1000 / 4100,
        3,
      );
    });

    it('returns MMK price when target currency is unknown and has no rates', () => {
      expect(getItemPrice(baseItem, [], 'EUR', [])).toBe(1000);
    });
  });
});
