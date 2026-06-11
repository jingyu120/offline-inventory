import { z } from 'zod';

// Domain layer barrel.
//
// The large, purely-structural type blocks have been extracted into focused
// modules and are re-exported here so the historical import path
// (`@burma-inventory/shared-types` and `./shared-types`) is unchanged:
//
//   ./records  → snake_case on-disk / on-the-wire record interfaces
//   ./domain   → camelCase app-facing interfaces
//   ./sync     → sync protocol transport types
//   ../utils/guard → guardAsync error-isolation primitive
//
// The runtime validation layer (domain constants + zod schemas) stays in this
// module: it is the boundary guard for sync push/pull and belongs together.

export type * from './records';
export type * from './domain';
export type * from './sync';
export { guardAsync } from '../utils/guard';

// ─── Domain Constants ───────────────────────────────────────────────
// Centralized enums used by both frontend and backend.

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

// ─── Zod Validation Schemas ─────────────────────────────────────────
// Runtime validation for sync record payloads. Schemas mirror the snake_case
// record shapes in ./records.ts.

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
  credit_limit_mmk: z.number().default(0),
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
  finish_code: z.string().nullable().optional(),
  structural_class: z.string().nullable().optional(),
  dimensions: z.string().nullable().optional(),
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
  negotiated_price: z.number().nullable().optional(),
  objection_reason: z.string().nullable().optional(),
  competitor_price: z.number().nullable().optional(),
  viber_message_text: z.string().nullable().optional(),
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
  good_stock_count: z.number().int().default(0),
  wet_stock_count: z.number().int().default(0),
  bad_stock_count: z.number().int().default(0),
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

export const ExpectedInboundRecordSchema = z.object({
  id: z.string(),
  sku: z.string(),
  expected_quantity: z.number(),
  origin: z.string().default('Thailand'),
  estimated_arrival_date: z.string(),
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
