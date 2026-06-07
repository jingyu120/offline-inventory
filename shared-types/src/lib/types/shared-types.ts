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
  township_id?: string | null;
  ward_id?: string | null;
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
  base_wholesale_price?: number | null;
  base_currency?: string | null;
  volume_discount_brackets?: string | null;
  inventory_status: string;
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
  executed_by_id?: string | null;
  salesperson_id?: string | null;
  approved_by_id?: string | null;
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
  compliance_status: string;
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
  inventory_status: string;
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

export interface RepKpisRecord {
  id: string;
  rep_id: string;
  date: string;
  sales_volume: number;
  sales_target: number;
  visits_count: number;
  visits_target: number;
  created_at: number;
  updated_at: number;
}

export interface CurrencyExchangeRateRecord {
  id: string;
  currency: string;
  rate_to_kyat: number;
  pushed_at: number;
}

export interface CompetitorInsightRecord {
  id: string;
  product_name: string;
  street_price: number;
  photo_url: string | null;
  created_at: number;
  updated_at: number;
}

export interface PendingInventoryUpdateRecord {
  id: string;
  type: string;
  item_id: string | null;
  location_id: string;
  quantity_delta: number | null;
  sku: string | null;
  name: string | null;
  unit_price: number | null;
  category: string | null;
  submitted_by: string;
  status: string;
  created_at: number;
  updated_at: number;
}

export interface AuditEventRecord {
  event_id: string;
  trace_id: string | null;
  actor_id: string | null;
  device_id: string | null;
  entity_type: string;
  action: string;
  previous_state: string | null;
  new_state: string | null;
  gps_coordinates: string | null;
  hash: string | null;
  status: string;
  shop_id?: string | null;
  executed_by_id?: string | null;
  salesperson_id?: string | null;
  approved_by_id?: string | null;
  created_at: number;
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
  township_id: z.string().nullable().optional(),
  ward_id: z.string().nullable().optional(),
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
  base_wholesale_price: z.number().nullable().optional(),
  base_currency: z.string().nullable().optional(),
  volume_discount_brackets: z.string().nullable().optional(),
  inventory_status: z.string().default('AVAILABLE'),
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
  executed_by_id: z.string().nullable().optional(),
  salesperson_id: z.string().nullable().optional(),
  approved_by_id: z.string().nullable().optional(),
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
  compliance_status: z.string().default('APPROVED'),
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
  inventory_status: z.string().default('AVAILABLE'),
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

export const RepKpisRecordSchema = z.object({
  id: z.string(),
  rep_id: z.string(),
  date: z.string(),
  sales_volume: z.number().nonnegative(),
  sales_target: z.number().nonnegative(),
  visits_count: z.number().int().nonnegative(),
  visits_target: z.number().int().nonnegative(),
  created_at: z.number(),
  updated_at: z.number(),
});

export const CurrencyExchangeRateRecordSchema = z.object({
  id: z.string(),
  currency: z.string(),
  rate_to_kyat: z.number(),
  pushed_at: z.number(),
});

export const CompetitorInsightRecordSchema = z.object({
  id: z.string(),
  product_name: z.string(),
  street_price: z.number(),
  photo_url: z.string().nullable().optional(),
  created_at: z.number(),
  updated_at: z.number(),
});

export const PendingInventoryUpdateRecordSchema = z.object({
  id: z.string(),
  type: z.string(),
  item_id: z.string().nullable(),
  location_id: z.string(),
  quantity_delta: z.number().nullable(),
  sku: z.string().nullable(),
  name: z.string().nullable(),
  unit_price: z.number().nullable(),
  category: z.string().nullable(),
  submitted_by: z.string(),
  status: z.string().default('PENDING'),
  created_at: z.number(),
  updated_at: z.number(),
});

export const AuditEventRecordSchema = z.object({
  event_id: z.string(),
  trace_id: z.string().nullable().optional(),
  actor_id: z.string().nullable().optional(),
  device_id: z.string().nullable().optional(),
  entity_type: z.string(),
  action: z.string(),
  previous_state: z.string().nullable().optional(),
  new_state: z.string().nullable().optional(),
  gps_coordinates: z.string().nullable().optional(),
  hash: z.string().nullable().optional(),
  status: z.string().default('VALID'),
  shop_id: z.string().nullable().optional(),
  executed_by_id: z.string().nullable().optional(),
  salesperson_id: z.string().nullable().optional(),
  approved_by_id: z.string().nullable().optional(),
  created_at: z.number(),
});

export const TownshipRecordSchema = z.object({
  id: z.string(),
  name: z.string(),
  region_id: z.string(),
  created_at: z.number(),
  updated_at: z.number(),
});

export const WardRecordSchema = z.object({
  id: z.string(),
  name: z.string(),
  township_id: z.string(),
  created_at: z.number(),
  updated_at: z.number(),
});

export const RECORD_SCHEMAS: Record<string, z.ZodSchema> = {
  regions: RegionRecordSchema,
  townships: TownshipRecordSchema,
  wards: WardRecordSchema,
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
  rep_kpis: RepKpisRecordSchema,
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
  currency_exchange_rates: CurrencyExchangeRateRecordSchema,
  competitor_insights: CompetitorInsightRecordSchema,
  pending_inventory_updates: PendingInventoryUpdateRecordSchema,
  audit_events: AuditEventRecordSchema,
  expected_inbounds: z.object({
    id: z.string(),
    sku: z.string(),
    expected_quantity: z.number(),
    origin: z.string(),
    estimated_arrival_date: z.string(),
    created_at: z.number(),
    updated_at: z.number(),
  }),
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
      townships: WatermelonChangeSetSchema(TownshipRecordSchema),
      wards: WatermelonChangeSetSchema(WardRecordSchema),
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
      rep_kpis: WatermelonChangeSetSchema(RepKpisRecordSchema),
      currency_exchange_rates: WatermelonChangeSetSchema(
        CurrencyExchangeRateRecordSchema,
      ),
      competitor_insights: WatermelonChangeSetSchema(
        CompetitorInsightRecordSchema,
      ),
      pending_inventory_updates: WatermelonChangeSetSchema(
        PendingInventoryUpdateRecordSchema,
      ),
      audit_events: WatermelonChangeSetSchema(AuditEventRecordSchema),
      expected_inbounds: WatermelonChangeSetSchema(
        z.object({
          id: z.string(),
          sku: z.string(),
          expected_quantity: z.number(),
          origin: z.string(),
          estimated_arrival_date: z.string(),
          created_at: z.number(),
          updated_at: z.number(),
        }),
      ),
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
  | 'telemetry_logs'
  | 'rep_kpis'
  | 'currency_exchange_rates'
  | 'competitor_insights'
  | 'pending_inventory_updates'
  | 'audit_events'
  | 'expected_inbounds';

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
  townshipId?: string | null;
  wardId?: string | null;
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
  baseWholesalePrice?: number | null;
  baseCurrency?: string | null;
  volumeDiscountBrackets?: string | null;
  inventoryStatus?: string;
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
  executedById?: string | null;
  salespersonId?: string | null;
  approvedById?: string | null;
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
  complianceStatus: string;
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
  inventoryStatus?: string;
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

export interface RepKpis {
  id: string;
  repId: string;
  date: string;
  salesVolume: number;
  salesTarget: number;
  visitsCount: number;
  visitsTarget: number;
  createdAt: number;
  updatedAt: number;
}

export interface CurrencyExchangeRate {
  id: string;
  currency: string;
  rateToKyat: number;
  pushedAt: number;
}

export interface CompetitorInsight {
  id: string;
  productName: string;
  streetPrice: number;
  photoUrl: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface PendingInventoryUpdate {
  id: string;
  type: string;
  itemId: string | null;
  locationId: string;
  quantityDelta: number | null;
  sku: string | null;
  name: string | null;
  unitPrice: number | null;
  category: string | null;
  submittedBy: string;
  status: string;
  createdAt: number;
  updatedAt: number;
}

export interface TownshipRecord {
  id: string;
  name: string;
  region_id: string;
  created_at: number;
  updated_at: number;
}

export interface WardRecord {
  id: string;
  name: string;
  township_id: string;
  created_at: number;
  updated_at: number;
}

export interface Township {
  id: string;
  name: string;
  regionId: string;
  createdAt: number;
  updatedAt: number;
}

export interface Ward {
  id: string;
  name: string;
  townshipId: string;
  createdAt: number;
  updatedAt: number;
}

export interface ExpectedInboundRecord {
  id: string;
  sku: string;
  expected_quantity: number;
  origin: string;
  estimated_arrival_date: string;
  created_at: number;
  updated_at: number;
}

export interface ExpectedInbound {
  id: string;
  sku: string;
  expectedQuantity: number;
  origin: string;
  estimatedArrivalDate: string;
  createdAt: number;
  updatedAt: number;
}

export const ExpectedInboundRecordSchema = z.object({
  id: z.string(),
  sku: z.string(),
  expected_quantity: z.number(),
  origin: z.string().default('Thailand'),
  estimated_arrival_date: z.string(),
  created_at: z.number(),
  updated_at: z.number(),
});
