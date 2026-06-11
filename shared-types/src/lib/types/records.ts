// ─── Sync Record Types ─────────────────────────────────────────────
// Snake_case to match the local DB column naming convention. These are the
// over-the-wire / on-disk shapes; see ./domain.ts for the camelCase app types.

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
  credit_limit_mmk: number;
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
  finish_code?: string | null;
  structural_class?: string | null;
  dimensions?: string | null;
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
  negotiated_price: number | null;
  objection_reason: string | null;
  competitor_price: number | null;
  viber_message_text: string | null;
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
  good_stock_count: number;
  wet_stock_count: number;
  bad_stock_count: number;
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

export interface ProjectRecord {
  id: string;
  name: string;
  created_at: number;
  updated_at: number;
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

export interface ExpectedInboundRecord {
  id: string;
  sku: string;
  expected_quantity: number;
  origin: string;
  estimated_arrival_date: string;
  created_at: number;
  updated_at: number;
}
