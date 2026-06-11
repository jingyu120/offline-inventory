import { RepUser } from '../../core/auth/auth';
import { PendingInventoryUpdateRow, StockLocationRow } from './types';

const ID_RADIX = 36;
const ID_SLICE_START = 2;
const ID_SLICE_END = 15;
const PENDING_UPDATE_ID_PREFIX = 'pending-update-';

/** Generate a random id for a stock / item record (preserves legacy format). */
export const generateStockId = (): string =>
  Math.random().toString(ID_RADIX).substring(ID_SLICE_START, ID_SLICE_END);

/** Generate a prefixed random id for a pending inventory update record. */
export const generatePendingUpdateId = (): string =>
  `${PENDING_UPDATE_ID_PREFIX}${generateStockId()}`;

/** Stock counts can never drop below zero. */
export const clampStock = (value: number): number => Math.max(0, value);

/** A manager or admin can act on any warehouse without geofence verification. */
export const isManagerOrAdmin = (rep: RepUser): boolean =>
  rep.role === 'manager' || rep.role === 'admin';

/**
 * A standard rep may approve a pending update only when standing at the
 * specific warehouse the update targets.
 */
export const canRepApproveUpdate = (
  update: PendingInventoryUpdateRow,
  selectedWarehouseId: string,
  isNearWarehouse: boolean,
): boolean => selectedWarehouseId === update.location_id && isNearWarehouse;

/** Resolve the display name for the warehouse a pending update targets. */
export const resolveWarehouseName = (
  warehouses: StockLocationRow[],
  locationId: string | null,
  fallback: string,
): string => {
  const match = warehouses.find((w) => w.id === locationId);
  return match ? match.name : fallback;
};

export interface ParsedPriceResult {
  isValid: boolean;
  value: number;
}

/** Parse and validate a positive monetary input. */
export const parsePositivePrice = (raw: string): ParsedPriceResult => {
  const value = parseFloat(raw);
  return { isValid: !isNaN(value) && value > 0, value };
};

/** Parse an integer stock quantity, defaulting to zero on failure. */
export const parseStockQuantity = (raw: string): number =>
  parseInt(raw, 10) || 0;
