// ─── Domain Constants ───────────────────────────────────────────────
// Centralized enums used by both frontend and backend.
// Adding a new value here automatically makes it available everywhere.

export const INTERACTION_TYPES = ['PHONE_CALL', 'VIBER', 'SHOP_VISIT'] as const;
export type InteractionType = (typeof INTERACTION_TYPES)[number];

export const COMMERCIAL_STATUSES = [
  'FOLLOWED_UP',
  'INTERESTED',
  'ORDER_PLACED',
  'NOT_INTERESTED',
] as const;
export type CommercialStatus = (typeof COMMERCIAL_STATUSES)[number];

export const SENTIMENT_TRENDS = ['IMPROVING', 'STABLE', 'DECLINING'] as const;
export type SentimentTrend = (typeof SENTIMENT_TRENDS)[number];

export const INTEREST_LEVELS = ['HIGH', 'MEDIUM', 'LOW'] as const;
export type InterestLevel = (typeof INTEREST_LEVELS)[number];

// ─── Sync Record Types ─────────────────────────────────────────────
// Snake_case to match WatermelonDB column naming convention.

export interface RegionRecord {
  id: string;
  name: string;
  division: string;
  created_at: number;
  updated_at: number;
}

export interface ShopRecord {
  id: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  region_id: string;
  assigned_rep_id: string | null;
  lifetime_value: number;
  sentiment_trend: string;
  created_at: number;
  updated_at: number;
}

export interface ContactRecord {
  id: string;
  shop_id: string;
  name: string;
  phone_number: string;
  email: string | null;
  is_primary: boolean;
  created_at: number;
  updated_at: number;
}

export interface ItemRecord {
  id: string;
  sku: string;
  name: string;
  unit_price: number;
  category: string;
  created_at: number;
  updated_at: number;
}

export interface InteractionLogRecord {
  id: string;
  shop_id: string;
  rep_id: string;
  type: string;
  commercial_status: string;
  notes: string;
  next_follow_up_date: number | null;
  viber_screenshot_url: string | null;
  created_at_local: number;
  synced_at_server: number | null;
  is_offline_entry: boolean;
  device_id: string;
  created_at: number;
  updated_at: number;
}

export interface InteractionItemRecord {
  id: string;
  interaction_log_id: string;
  item_id: string;
  quantity: number;
  unit_price_at_sale: number;
  interest_level: string | null;
}

export interface DailyQuotaRecord {
  id: string;
  user_id: string;
  target_visits: number;
  target_phone: number;
  target_viber: number;
  effective_from: number;
  created_at: number;
  updated_at: number;
}

export interface ItemStockRecord {
  id: string;
  item_id: string;
  quantity: number;
  created_at: number;
  updated_at: number;
}

// ─── Sync Protocol Types ────────────────────────────────────────────

/** Generic WatermelonDB sync change-set for a single table. */
export interface WatermelonChangeSet<T> {
  created: T[];
  updated: T[];
  deleted: string[];
}

/** Table name union — matches WatermelonDB table names exactly. */
export type SyncTableName =
  | 'regions'
  | 'shops'
  | 'contacts'
  | 'items'
  | 'interaction_logs'
  | 'interaction_items'
  | 'daily_quotas'
  | 'item_stocks';

/** Full pull-response payload returned by sync-server. */
export interface PullChangesResponse {
  changes: Record<SyncTableName, WatermelonChangeSet<unknown>>;
  timestamp: number;
}

/** Push-request body sent by the frontend. */
export interface PushChangesBody {
  changes: Partial<Record<SyncTableName, WatermelonChangeSet<unknown>>>;
}
