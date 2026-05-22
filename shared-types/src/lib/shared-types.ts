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
  price_book_id: string | null;
  price_tier: string;
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
  brand_id: string | null;
  thickness: string | null;
  weight: string | null;
  unit_type: string;
  conversion_factor: number;
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
  unit_price: number | null;
  selected_currency: string | null;
  selected_unit: string | null;
  created_at: number;
  updated_at: number;
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

export interface PlannedRouteRecord {
  id: string;
  rep_id: string;
  date: string;
  shop_ids: string;
  created_at: number;
  updated_at: number;
}

export interface CheckInLogRecord {
  id: string;
  shop_id: string;
  rep_id: string;
  check_in_time: number;
  latitude: number;
  longitude: number;
  verified: boolean;
  created_at: number;
  updated_at: number;
}

export interface ViberChannelRecord {
  id: string;
  user_id: string;
  viber_profile_id: string;
  created_at: number;
  updated_at: number;
}

export interface PredictionLogRecord {
  id: string;
  shop_id: string;
  predicted_ltv: number;
  churn_risk: number;
  stockout_risk: number;
  created_at: number;
  updated_at: number;
}

export interface RecommendedOrderRecord {
  id: string;
  shop_id: string;
  item_id: string;
  quantity: number;
  confidence: number;
  created_at: number;
  updated_at: number;
}

export interface PriceBookRecord {
  id: string;
  name: string;
  region_id: string | null;
  created_at: number;
  updated_at: number;
}

export interface PriceBookItemRecord {
  id: string;
  price_book_id: string;
  item_id: string;
  price: number;
  currency: string;
  created_at: number;
  updated_at: number;
}

export interface ExchangeRateRecord {
  id: string;
  from_currency: string;
  to_currency: string;
  rate: number;
  updated_at: number;
}

export interface RepScoreRecord {
  id: string;
  rep_id: string;
  points: number;
  streak_days: number;
  badges: string;
  created_at: number;
  updated_at: number;
}

export interface PointsLogRecord {
  id: string;
  rep_id: string;
  points_added: number;
  reason: string;
  created_at: number;
}

export interface BrandRecord {
  id: string;
  name: string;
  created_at: number;
  updated_at: number;
}

export interface StockLocationRecord {
  id: string;
  name: string;
  created_at: number;
  updated_at: number;
}

export interface StockBalanceRecord {
  id: string;
  item_id: string;
  location_id: string;
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
  | 'item_stocks'
  | 'planned_routes'
  | 'check_in_logs'
  | 'prediction_logs'
  | 'recommended_orders'
  | 'price_books'
  | 'price_book_items'
  | 'exchange_rates'
  | 'rep_scores'
  | 'points_logs'
  | 'brands'
  | 'stock_locations'
  | 'stock_balances';

/** Full pull-response payload returned by sync-server. */
export interface PullChangesResponse {
  changes: Record<SyncTableName, WatermelonChangeSet<unknown>>;
  timestamp: number;
}

/** Push-request body sent by the frontend. */
export interface PushChangesBody {
  changes: Partial<Record<SyncTableName, WatermelonChangeSet<unknown>>>;
}

/**
 * Executes an asynchronous operation, catching any exceptions and returning a
 * type-safe tuple [result, error].
 */
export async function guardAsync<T, E = Error>(
  promise: Promise<T>,
): Promise<[T, null] | [null, E]> {
  try {
    const data = await promise;
    return [data, null];
  } catch (error) {
    return [null, error as E];
  }
}

export interface Region {
  id: string;
  name: string;
  division: string;
  createdAt: number;
  updatedAt: number;
}

export interface Shop {
  id: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  regionId: string;
  assignedRepId: string | null;
  lifetimeValue: number;
  sentimentTrend: string;
  priceBookId: string | null;
  priceTier: string;
  createdAt: number;
  updatedAt: number;
}

export interface Contact {
  id: string;
  shopId: string;
  name: string;
  phoneNumber: string;
  email: string | null;
  isPrimary: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Item {
  id: string;
  sku: string;
  name: string;
  unitPrice: number;
  category: string;
  brandId: string | null;
  thickness: string | null;
  weight: string | null;
  unitType: string;
  conversionFactor: number;
  createdAt: number;
  updatedAt: number;
}

export interface InteractionLog {
  id: string;
  shopId: string;
  repId: string;
  type: string;
  commercialStatus: string;
  notes: string;
  nextFollowUpDate: number | null;
  viberScreenshotUrl: string | null;
  createdAtLocal: number;
  syncedAtServer: number | null;
  isOfflineEntry: boolean;
  deviceId: string;
  createdAt: number;
  updatedAt: number;
}

export interface InteractionItem {
  id: string;
  interactionLogId: string;
  itemId: string;
  quantity: number;
  unitPriceAtSale: number;
  interestLevel: string | null;
  unitPrice: number | null;
  selectedCurrency: string | null;
  selectedUnit: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface DailyQuota {
  id: string;
  userId: string;
  targetVisits: number;
  targetPhone: number;
  targetViber: number;
  effectiveFrom: number;
  createdAt: number;
  updatedAt: number;
}

export interface ItemStock {
  id: string;
  itemId: string;
  quantity: number;
  createdAt: number;
  updatedAt: number;
}

export interface PlannedRoute {
  id: string;
  repId: string;
  date: string;
  shopIds: string;
  createdAt: number;
  updatedAt: number;
}

export interface CheckInLog {
  id: string;
  shopId: string;
  repId: string;
  checkInTime: number;
  latitude: number;
  longitude: number;
  verified: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ViberChannel {
  id: string;
  userId: string;
  viberProfileId: string;
  createdAt: number;
  updatedAt: number;
}

export interface PredictionLog {
  id: string;
  shopId: string;
  predictedLtv: number;
  churnRisk: number;
  stockoutRisk: number;
  createdAt: number;
  updatedAt: number;
}

export interface RecommendedOrder {
  id: string;
  shopId: string;
  itemId: string;
  quantity: number;
  confidence: number;
  createdAt: number;
  updatedAt: number;
}

export interface PriceBook {
  id: string;
  name: string;
  regionId: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface PriceBookItem {
  id: string;
  priceBookId: string;
  itemId: string;
  price: number;
  currency: string;
  createdAt: number;
  updatedAt: number;
}

export interface ExchangeRate {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  updatedAt: number;
}

export interface RepScore {
  id: string;
  repId: string;
  points: number;
  streakDays: number;
  badges: string;
  createdAt: number;
  updatedAt: number;
}

export interface PointsLog {
  id: string;
  repId: string;
  pointsAdded: number;
  reason: string;
  createdAt: number;
}
