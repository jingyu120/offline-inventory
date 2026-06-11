import { InferSelectModel } from 'drizzle-orm';
import { Item, sqliteSchema } from '@burma-inventory/shared-types';

/** Raw SQLite row shapes (snake_case) for the tables the Intake screen reads directly. */
export type PendingInventoryUpdateRow = InferSelectModel<
  typeof sqliteSchema.pending_inventory_updates
>;
export type StockLocationRow = InferSelectModel<
  typeof sqliteSchema.stock_locations
>;

/** A catalogue item enriched with its current good-stock quantity. */
export interface ExtendedItem extends Item {
  stockQty: number;
}

/** Discriminator values for a pending inventory update record. */
export const PENDING_UPDATE_TYPE = {
  STOCK_ADJUSTMENT: 'STOCK_ADJUSTMENT',
  NEW_SKU: 'NEW_SKU',
} as const;

/** Lifecycle status values for a pending inventory update record. */
export const PENDING_UPDATE_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;

/** Transient form state captured while editing a pending update inline. */
export interface PendingUpdateEditState {
  editingUpdateId: string | null;
  editQtyDelta: string;
  editSku: string;
  editName: string;
  editPrice: string;
  editCategory: string;
}
