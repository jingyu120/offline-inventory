import { Item } from '@burma-inventory/shared-types';
import { getItemPrice as getBasePrice } from '../../core/utils/pricing';
import { getConversionMultiplier } from '../../core/data/repositories';
import { OVERRIDE_MARGIN_LIMIT_FACTOR } from '../../config/appConfig';
import { ExchangeRateRow, PriceBookItemRow } from './types';

/** A single volume-discount tier parsed from an item's bracket JSON. */
interface VolumeDiscountBracket {
  quantity: number;
  discount_percent: number;
}

/** Snapshot of the pricing inputs needed to value an item in a currency. */
export interface AuditPricingContext {
  priceBookItems: PriceBookItemRow[];
  exchangeRates: ExchangeRateRow[];
  selectedCurrency: string;
}

/** Resolve the per-PCS base price of an item honouring price-book overrides. */
export function getItemPrice(item: Item, context: AuditPricingContext): number {
  return getBasePrice(
    item,
    context.priceBookItems,
    context.selectedCurrency,
    context.exchangeRates,
  );
}

function parseVolumeDiscountBrackets(
  raw: string | null | undefined,
): VolumeDiscountBracket[] {
  if (!raw) {
    return [];
  }
  try {
    const brackets = JSON.parse(raw);
    if (Array.isArray(brackets)) {
      return brackets as VolumeDiscountBracket[];
    }
  } catch (err) {
    console.error('Failed to parse volume discount brackets:', err);
  }
  return [];
}

/**
 * Compute the unit price for a line, applying the unit conversion multiplier
 * and any qualifying volume-discount bracket for the given quantity.
 */
export function getDiscountedUnitPrice(
  item: Item,
  quantity: number,
  unit: string,
  context: AuditPricingContext,
): number {
  const basePrice = getItemPrice(item, context);
  const multiplier = getConversionMultiplier(item, unit);
  let unitPrice = basePrice * multiplier;

  const brackets = parseVolumeDiscountBrackets(item.volumeDiscountBrackets);
  if (brackets.length > 0) {
    const sortedBrackets = [...brackets].sort(
      (a, b) => b.quantity - a.quantity,
    );
    const matchingBracket = sortedBrackets.find(
      (bracket) => quantity >= bracket.quantity,
    );
    if (matchingBracket && matchingBracket.discount_percent) {
      unitPrice = unitPrice * (1 - matchingBracket.discount_percent / 100);
    }
  }

  return unitPrice;
}

/**
 * Flag a line whose negotiated unit price falls below the wholesale floor
 * (a configurable fraction of the item's list price).
 */
export function isBelowWholesaleFloor(
  unitPrice: number | string,
  item: Item,
  context: AuditPricingContext,
): boolean {
  return (
    Number(unitPrice || 0) <
    getItemPrice(item, context) * OVERRIDE_MARGIN_LIMIT_FACTOR
  );
}
