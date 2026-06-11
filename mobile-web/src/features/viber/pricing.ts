import { Item } from '@burma-inventory/shared-types';
import { CURRENCIES } from '../../config/appConfig';
import { getConversionMultiplier } from '../../core/data/repositories';
import {
  DraftLineItem,
  ExchangeRateRow,
  PriceBookItemRow,
  PricingContext,
} from './types';

const BASE_CURRENCY = 'MMK';

/** Resolve the base price and currency for an item, honouring any price-book override. */
function resolveBasePrice(
  item: Item,
  priceBookItems: PriceBookItemRow[],
): { basePrice: number; baseCurrency: string } {
  const pbItem = priceBookItems.find((pbi) => pbi.item_id === item.id);
  if (pbItem) {
    return { basePrice: pbItem.price, baseCurrency: pbItem.currency };
  }
  return { basePrice: item.unitPrice, baseCurrency: BASE_CURRENCY };
}

/** Convert an MMK-denominated price into the target currency using live or default rates. */
function convertFromMmk(
  priceInMmk: number,
  targetCurrency: string,
  exchangeRates: ExchangeRateRow[],
): number {
  if (targetCurrency === BASE_CURRENCY) {
    return priceInMmk;
  }
  const rateFromMmk = exchangeRates.find(
    (r) =>
      r.from_currency === targetCurrency && r.to_currency === BASE_CURRENCY,
  );
  if (rateFromMmk && rateFromMmk.rate > 0) {
    return priceInMmk / rateFromMmk.rate;
  }
  const matchedConfig = CURRENCIES.find((c) => c.value === targetCurrency);
  if (matchedConfig && matchedConfig.defaultRateToMmk > 0) {
    return priceInMmk / matchedConfig.defaultRateToMmk;
  }
  return priceInMmk;
}

/** Compute the per-unit (PCS) price of an item in the selected currency. */
export function getItemPrice(item: Item, context: PricingContext): number {
  const { priceBookItems, exchangeRates, selectedCurrency } = context;
  const { basePrice, baseCurrency } = resolveBasePrice(item, priceBookItems);

  if (baseCurrency === selectedCurrency) {
    return basePrice;
  }

  let priceInMmk = basePrice;
  if (baseCurrency !== BASE_CURRENCY) {
    const rateToMmk = exchangeRates.find(
      (r) =>
        r.from_currency === baseCurrency && r.to_currency === BASE_CURRENCY,
    );
    if (rateToMmk) {
      priceInMmk = basePrice * rateToMmk.rate;
    }
  }

  return convertFromMmk(priceInMmk, selectedCurrency, exchangeRates);
}

/** Compute the price for a given unit by applying the conversion multiplier. */
export function getUnitPrice(
  item: Item,
  selectedUnit: string,
  context: PricingContext,
): number {
  return (
    getItemPrice(item, context) * getConversionMultiplier(item, selectedUnit)
  );
}

/**
 * Recompute every basket line's unit price when the currency changes. This
 * intentionally derives the base price inline (rather than via getItemPrice) to
 * preserve the exact conversion path used by the original screen.
 */
export function recalculateBasketForCurrency(
  items: DraftLineItem[],
  targetCurrency: string,
  priceBookItems: PriceBookItemRow[],
  exchangeRates: ExchangeRateRow[],
): DraftLineItem[] {
  return items.map((si) => {
    const { basePrice, baseCurrency } = resolveBasePrice(
      si.item,
      priceBookItems,
    );

    let priceInMmk = basePrice;
    if (baseCurrency !== BASE_CURRENCY) {
      const rateToMmk = exchangeRates.find(
        (r) =>
          r.from_currency === baseCurrency && r.to_currency === BASE_CURRENCY,
      );
      if (rateToMmk) {
        priceInMmk = basePrice * rateToMmk.rate;
      }
    }

    const finalPrice = convertFromMmk(
      priceInMmk,
      targetCurrency,
      exchangeRates,
    );
    const multiplier = getConversionMultiplier(si.item, si.selectedUnit);
    return { ...si, unitPrice: finalPrice * multiplier };
  });
}
