import { InferSelectModel } from 'drizzle-orm';
import { Item, sqliteSchema } from '@burma-inventory/shared-types';

/** Raw SQLite row shapes (snake_case) for the tables the logging screen reads. */
export type PriceBookItemRow = InferSelectModel<
  typeof sqliteSchema.price_book_items
>;
export type ExchangeRateRow = InferSelectModel<
  typeof sqliteSchema.exchange_rates
>;
export type InteractionLogRow = InferSelectModel<
  typeof sqliteSchema.interaction_logs
>;
export type InteractionItemRow = InferSelectModel<
  typeof sqliteSchema.interaction_items
>;
export type ProjectRow = InferSelectModel<typeof sqliteSchema.projects>;
export type InvoiceRow = InferSelectModel<typeof sqliteSchema.invoices>;
export type DraftCartRow = InferSelectModel<typeof sqliteSchema.draft_carts>;

/**
 * A single line item being logged. Quantity / unit price are kept as
 * `number | string` because they are bound directly to text inputs while
 * editing.
 */
export interface InteractionLineItem {
  item: Item;
  quantity: number | string;
  selectedUnit: string;
  unitPrice: number | string;
  stockCondition: string;
  pendingAllocationCount: number;
}

/** Shape returned by the AI screenshot-verification endpoint. */
export interface VerifyScreenshotResponse {
  extractedText?: string;
}

/** Result of evaluating a shop's credit / overdue blocked status. */
export interface BlockedStatusResult {
  isBlocked: boolean;
}

export type { Item };
