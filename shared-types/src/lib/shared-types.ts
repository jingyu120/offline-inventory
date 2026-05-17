/** Status values for an inventory item — shared by frontend (WatermelonDB) and backend (Prisma). */
export type InventoryStatus = 'EXPECTED' | 'INVENTORY' | 'HISTORICAL';

/** Shape of a serialized inventory record passed in sync payloads (snake_case matches WatermelonDB). */
export interface InventoryItemRecord {
  id: string;
  barcode: string;
  name: string;
  quantity: number;
  status: InventoryStatus;
  user_id: string | null;
  location: string | null;
  received_at: number | null;
  sold_at: number | null;
  created_at: number;
  updated_at: number;
}

/** Generic WatermelonDB sync change-set for a single table. */
export interface WatermelonChangeSet<T> {
  created: T[];
  updated: T[];
  deleted: string[];
}

/** Full pull-response payload returned by sync-server. */
export interface PullChangesResponse {
  changes: {
    inventory_items: WatermelonChangeSet<InventoryItemRecord>;
  };
  timestamp: number;
}

/** Push-request body sent by the frontend. */
export interface PushChangesBody {
  changes: {
    inventory_items?: WatermelonChangeSet<InventoryItemRecord>;
  };
}
