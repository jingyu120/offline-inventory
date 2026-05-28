import { z } from 'zod';

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
  color: string | null;
  material_sub_type: string | null;
  hardware_finish: string | null;
  is_in_deficit: boolean;
  created_at: number;
  updated_at: number;
}

export interface InteractionLogRecord {
  id: string;
  shop_id: string;
  rep_id: string;
  project_id: string | null;
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
  stock_condition: string;
  pending_allocation_count: number;
  fulfillment_status: string;
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
  pending_allocation_count: number;
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

// ─── Zod Validation Schemas ─────────────────────────────────────────

export const RegionRecordSchema = z.object({
  id: z.string(),
  name: z.string(),
  division: z.string(),
  created_at: z.number(),
  updated_at: z.number(),
});

export const ShopRecordSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  region_id: z.string(),
  assigned_rep_id: z.string().nullable(),
  lifetime_value: z.number().nonnegative().default(0),
  sentiment_trend: z.string().default('STABLE'),
  price_book_id: z.string().nullable(),
  price_tier: z.string().default('Retailer'),
  created_at: z.number(),
  updated_at: z.number(),
});

export const ContactRecordSchema = z.object({
  id: z.string(),
  shop_id: z.string(),
  name: z.string(),
  phone_number: z.string(),
  email: z.string().nullable(),
  is_primary: z.boolean().default(false),
  created_at: z.number(),
  updated_at: z.number(),
});

export const ItemRecordSchema = z.object({
  id: z.string(),
  sku: z.string(),
  name: z.string(),
  unit_price: z.number(),
  category: z.string(),
  brand_id: z.string().nullable(),
  thickness: z.string().nullable(),
  weight: z.string().nullable(),
  unit_type: z.string().default('PCS'),
  conversion_factor: z.number().default(1),
  color: z.string().nullable(),
  material_sub_type: z.string().nullable(),
  hardware_finish: z.string().nullable(),
  is_in_deficit: z.boolean().default(false),
  created_at: z.number(),
  updated_at: z.number(),
});

export const InteractionLogRecordSchema = z.object({
  id: z.string(),
  shop_id: z.string(),
  rep_id: z.string(),
  project_id: z.string().nullable(),
  type: z.string(),
  commercial_status: z.string(),
  notes: z.string(),
  next_follow_up_date: z.number().nullable(),
  viber_screenshot_url: z.string().nullable(),
  created_at_local: z.number(),
  synced_at_server: z.number().nullable(),
  is_offline_entry: z.boolean().default(false),
  device_id: z.string(),
  created_at: z.number(),
  updated_at: z.number(),
  ai_verification_status: z.string().nullable().optional(),
  ai_verification_notes: z.string().nullable().optional(),
});

export const InteractionItemRecordSchema = z.object({
  id: z.string(),
  interaction_log_id: z.string(),
  item_id: z.string(),
  quantity: z.number().int().positive(),
  unit_price_at_sale: z.number().nonnegative(),
  interest_level: z.string().nullable(),
  unit_price: z.number().nullable(),
  selected_currency: z.string().nullable().default('MMK'),
  selected_unit: z.string().nullable().default('PCS'),
  stock_condition: z.string().default('GOOD'),
  pending_allocation_count: z.number().int().nonnegative(),
  fulfillment_status: z.string().default('PENDING_FULFILLMENT'),
  created_at: z.number(),
  updated_at: z.number(),
});

export const DailyQuotaRecordSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  target_visits: z.number().int().nonnegative().default(0),
  target_phone: z.number().int().nonnegative().default(0),
  target_viber: z.number().int().nonnegative().default(0),
  effective_from: z.number(),
  created_at: z.number(),
  updated_at: z.number(),
});

export const ItemStockRecordSchema = z.object({
  id: z.string(),
  item_id: z.string(),
  quantity: z.number().int().nonnegative().default(0),
  pending_allocation_count: z.number().int().nonnegative().default(0),
  created_at: z.number(),
  updated_at: z.number(),
});

export const PlannedRouteRecordSchema = z.object({
  id: z.string(),
  rep_id: z.string(),
  date: z.string(),
  shop_ids: z.string(),
  created_at: z.number(),
  updated_at: z.number(),
});

export const CheckInLogRecordSchema = z.object({
  id: z.string(),
  shop_id: z.string(),
  rep_id: z.string(),
  check_in_time: z.number(),
  latitude: z.number(),
  longitude: z.number(),
  verified: z.boolean().default(false),
  created_at: z.number(),
  updated_at: z.number(),
});

export const ViberChannelRecordSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  viber_profile_id: z.string(),
  created_at: z.number(),
  updated_at: z.number(),
});

export const PredictionLogRecordSchema = z.object({
  id: z.string(),
  shop_id: z.string(),
  predicted_ltv: z.number().default(0),
  churn_risk: z.number().default(0),
  stockout_risk: z.number().default(0),
  created_at: z.number(),
  updated_at: z.number(),
});

export const RecommendedOrderRecordSchema = z.object({
  id: z.string(),
  shop_id: z.string(),
  item_id: z.string(),
  quantity: z.number().int().nonnegative().default(0),
  confidence: z.number().default(0),
  created_at: z.number(),
  updated_at: z.number(),
});

export const PriceBookRecordSchema = z.object({
  id: z.string(),
  name: z.string(),
  region_id: z.string().nullable(),
  created_at: z.number(),
  updated_at: z.number(),
});

export const PriceBookItemRecordSchema = z.object({
  id: z.string(),
  price_book_id: z.string(),
  item_id: z.string(),
  price: z.number(),
  currency: z.string().default('MMK'),
  created_at: z.number(),
  updated_at: z.number(),
});

export const ExchangeRateRecordSchema = z.object({
  id: z.string(),
  from_currency: z.string(),
  to_currency: z.string(),
  rate: z.number(),
  updated_at: z.number(),
});

export const RepScoreRecordSchema = z.object({
  id: z.string(),
  rep_id: z.string(),
  points: z.number().int().nonnegative().default(0),
  streak_days: z.number().int().nonnegative().default(0),
  badges: z.string().default('[]'),
  created_at: z.number(),
  updated_at: z.number(),
});

export const PointsLogRecordSchema = z.object({
  id: z.string(),
  rep_id: z.string(),
  points_added: z.number().int(),
  reason: z.string(),
  created_at: z.number(),
});

export const BrandRecordSchema = z.object({
  id: z.string(),
  name: z.string(),
  created_at: z.number(),
  updated_at: z.number(),
});

export const StockLocationRecordSchema = z.object({
  id: z.string(),
  name: z.string(),
  created_at: z.number(),
  updated_at: z.number(),
});

export const StockBalanceRecordSchema = z.object({
  id: z.string(),
  item_id: z.string(),
  location_id: z.string(),
  quantity: z.number().int().nonnegative().default(0),
  created_at: z.number(),
  updated_at: z.number(),
});

export const ProjectRecordSchema = z.object({
  id: z.string(),
  name: z.string(),
  created_at: z.number(),
  updated_at: z.number(),
});

export const TelemetryLogRecordSchema = z.object({
  id: z.string(),
  level: z.string(),
  event_type: z.string(),
  message: z.string(),
  timestamp: z.number(),
  synced_at_server: z.number().nullable().optional(),
  created_at: z.number(),
  updated_at: z.number(),
});

export const RECORD_SCHEMAS: Record<string, z.ZodSchema> = {
  regions: RegionRecordSchema,
  shops: ShopRecordSchema,
  contacts: ContactRecordSchema,
  items: ItemRecordSchema,
  interaction_logs: InteractionLogRecordSchema,
  interaction_items: InteractionItemRecordSchema,
  daily_quotas: DailyQuotaRecordSchema,
  item_stocks: ItemStockRecordSchema,
  planned_routes: PlannedRouteRecordSchema,
  check_in_logs: CheckInLogRecordSchema,
  prediction_logs: PredictionLogRecordSchema,
  recommended_orders: RecommendedOrderRecordSchema,
  price_books: PriceBookRecordSchema,
  price_book_items: PriceBookItemRecordSchema,
  exchange_rates: ExchangeRateRecordSchema,
  rep_scores: RepScoreRecordSchema,
  points_logs: PointsLogRecordSchema,
  brands: BrandRecordSchema,
  stock_locations: StockLocationRecordSchema,
  stock_balances: StockBalanceRecordSchema,
  projects: ProjectRecordSchema,
  telemetry_logs: TelemetryLogRecordSchema,
};

export const WatermelonChangeSetSchema = <T extends z.ZodTypeAny>(
  recordSchema: T,
) =>
  z.object({
    created: z.array(recordSchema),
    updated: z.array(recordSchema),
    deleted: z.array(z.string()),
  });

export const PushChangesBodySchema = z.object({
  changes: z
    .object({
      regions: WatermelonChangeSetSchema(RegionRecordSchema),
      shops: WatermelonChangeSetSchema(ShopRecordSchema),
      contacts: WatermelonChangeSetSchema(ContactRecordSchema),
      items: WatermelonChangeSetSchema(ItemRecordSchema),
      interaction_logs: WatermelonChangeSetSchema(InteractionLogRecordSchema),
      interaction_items: WatermelonChangeSetSchema(InteractionItemRecordSchema),
      daily_quotas: WatermelonChangeSetSchema(DailyQuotaRecordSchema),
      item_stocks: WatermelonChangeSetSchema(ItemStockRecordSchema),
      planned_routes: WatermelonChangeSetSchema(PlannedRouteRecordSchema),
      check_in_logs: WatermelonChangeSetSchema(CheckInLogRecordSchema),
      prediction_logs: WatermelonChangeSetSchema(PredictionLogRecordSchema),
      recommended_orders: WatermelonChangeSetSchema(
        RecommendedOrderRecordSchema,
      ),
      price_books: WatermelonChangeSetSchema(PriceBookRecordSchema),
      price_book_items: WatermelonChangeSetSchema(PriceBookItemRecordSchema),
      exchange_rates: WatermelonChangeSetSchema(ExchangeRateRecordSchema),
      rep_scores: WatermelonChangeSetSchema(RepScoreRecordSchema),
      points_logs: WatermelonChangeSetSchema(PointsLogRecordSchema),
      brands: WatermelonChangeSetSchema(BrandRecordSchema),
      stock_locations: WatermelonChangeSetSchema(StockLocationRecordSchema),
      stock_balances: WatermelonChangeSetSchema(StockBalanceRecordSchema),
      projects: WatermelonChangeSetSchema(ProjectRecordSchema),
      telemetry_logs: WatermelonChangeSetSchema(TelemetryLogRecordSchema),
    })
    .partial(),
});

export const PushChangesPayloadSchema = PushChangesBodySchema.extend({
  device_id: z.string().optional(),
  user_id: z.string().optional(),
});

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
  | 'stock_balances'
  | 'projects'
  | 'telemetry_logs';

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
  color: string | null;
  materialSubType: string | null;
  hardwareFinish: string | null;
  isInDeficit: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface InteractionLog {
  id: string;
  shopId: string;
  repId: string;
  projectId: string | null;
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
  stockCondition: string;
  pendingAllocationCount: number;
  fulfillmentStatus: string;
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
  pendingAllocationCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface ProjectRecord {
  id: string;
  name: string;
  created_at: number;
  updated_at: number;
}

export interface Project {
  id: string;
  name: string;
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

export interface TelemetryLog {
  id: string;
  level: string;
  eventType: string;
  message: string;
  timestamp: number;
  syncedAtServer?: number | null;
  createdAt: number;
  updatedAt: number;
}
