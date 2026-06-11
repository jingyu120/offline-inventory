import { InferSelectModel } from 'drizzle-orm';
import { Item, sqliteSchema } from '@burma-inventory/shared-types';

/** Raw SQLite row shapes (snake_case) for the tables the drafter reads directly. */
export type PriceBookItemRow = InferSelectModel<
  typeof sqliteSchema.price_book_items
>;
export type ExchangeRateRow = InferSelectModel<
  typeof sqliteSchema.exchange_rates
>;
export type InteractionLogRow = InferSelectModel<
  typeof sqliteSchema.interaction_logs
>;
export type ProjectRow = InferSelectModel<typeof sqliteSchema.projects>;

/**
 * A single line item being drafted, staged, or held in the order basket.
 * Quantity / unit price are kept as `number | string` because they are bound
 * directly to text inputs while editing.
 */
export interface DraftLineItem {
  item: Item;
  quantity: number | string;
  selectedUnit: string;
  unitPrice: number | string;
  stockCondition: string;
  pendingAllocationCount: number;
}

/** Snapshot of the pricing context needed to value an item in the chosen currency. */
export interface PricingContext {
  priceBookItems: PriceBookItemRow[];
  exchangeRates: ExchangeRateRow[];
  selectedCurrency: string;
}

export type { Item };
