export interface TableSyncConfig<TRecord = $Any> {
  delegate: string;
  softDelete: boolean;
  hasTimestamps: boolean;
  toRecord: (row: $Any) => TRecord;
  toDrizzle: (record: TRecord) => $Any;
}

export const TABLE_REGISTRY: Record<string, TableSyncConfig> = {
  regions: {
    delegate: 'regions',
    softDelete: true,
    hasTimestamps: true,
    toRecord: (r) => r,
    toDrizzle: (r) => r,
  },
  shops: {
    delegate: 'shops',
    softDelete: true,
    hasTimestamps: true,
    toRecord: (s) => s,
    toDrizzle: (s) => s,
  },
  contacts: {
    delegate: 'contacts',
    softDelete: true,
    hasTimestamps: true,
    toRecord: (c) => c,
    toDrizzle: (c) => c,
  },
  items: {
    delegate: 'items',
    softDelete: true,
    hasTimestamps: true,
    toRecord: (i) => i,
    toDrizzle: (i) => i,
  },
  interaction_logs: {
    delegate: 'interaction_logs',
    softDelete: true,
    hasTimestamps: true,
    toRecord: (l) => l,
    toDrizzle: (l) => ({
      ...l,
      synced_at_server: Date.now(),
    }),
  },
  interaction_items: {
    delegate: 'interaction_items',
    softDelete: true,
    hasTimestamps: true,
    toRecord: (i) => i,
    toDrizzle: (i) => ({
      ...i,
      stock_condition: i.stock_condition || 'GOOD',
      pending_allocation_count: i.pending_allocation_count || 0,
      fulfillment_status: i.fulfillment_status || 'PENDING_FULFILLMENT',
    }),
  },
  daily_quotas: {
    delegate: 'daily_quotas',
    softDelete: true,
    hasTimestamps: true,
    toRecord: (q) => q,
    toDrizzle: (q) => q,
  },
  item_stocks: {
    delegate: 'item_stocks',
    softDelete: true,
    hasTimestamps: true,
    toRecord: (s) => s,
    toDrizzle: (s) => ({
      ...s,
      pending_allocation_count: s.pending_allocation_count || 0,
    }),
  },
  planned_routes: {
    delegate: 'planned_routes',
    softDelete: false,
    hasTimestamps: true,
    toRecord: (r) => r,
    toDrizzle: (r) => r,
  },
  check_in_logs: {
    delegate: 'check_in_logs',
    softDelete: false,
    hasTimestamps: true,
    toRecord: (c) => c,
    toDrizzle: (c) => c,
  },
  prediction_logs: {
    delegate: 'prediction_logs',
    softDelete: false,
    hasTimestamps: true,
    toRecord: (p) => p,
    toDrizzle: (p) => p,
  },
  recommended_orders: {
    delegate: 'recommended_orders',
    softDelete: false,
    hasTimestamps: true,
    toRecord: (r) => r,
    toDrizzle: (r) => r,
  },
  price_books: {
    delegate: 'price_books',
    softDelete: false,
    hasTimestamps: true,
    toRecord: (p) => p,
    toDrizzle: (p) => p,
  },
  price_book_items: {
    delegate: 'price_book_items',
    softDelete: false,
    hasTimestamps: true,
    toRecord: (p) => p,
    toDrizzle: (p) => p,
  },
  exchange_rates: {
    delegate: 'exchange_rates',
    softDelete: false,
    hasTimestamps: false,
    toRecord: (e) => e,
    toDrizzle: (e) => e,
  },
  rep_scores: {
    delegate: 'rep_scores',
    softDelete: false,
    hasTimestamps: true,
    toRecord: (s) => s,
    toDrizzle: (s) => ({
      ...s,
      badges: s.badges || '[]',
    }),
  },
  points_logs: {
    delegate: 'points_logs',
    softDelete: false,
    hasTimestamps: false,
    toRecord: (p) => p,
    toDrizzle: (p) => p,
  },
  brands: {
    delegate: 'brands',
    softDelete: true,
    hasTimestamps: true,
    toRecord: (b) => b,
    toDrizzle: (b) => b,
  },
  stock_locations: {
    delegate: 'stock_locations',
    softDelete: true,
    hasTimestamps: true,
    toRecord: (s) => s,
    toDrizzle: (s) => s,
  },
  stock_balances: {
    delegate: 'stock_balances',
    softDelete: true,
    hasTimestamps: true,
    toRecord: (s) => s,
    toDrizzle: (s) => s,
  },
  projects: {
    delegate: 'projects',
    softDelete: true,
    hasTimestamps: true,
    toRecord: (p) => p,
    toDrizzle: (p) => p,
  },
  telemetry_logs: {
    delegate: 'telemetry_logs',
    softDelete: false,
    hasTimestamps: false,
    toRecord: (l) => l,
    toDrizzle: (l) => l,
  },
  rep_kpis: {
    delegate: 'rep_kpis',
    softDelete: false,
    hasTimestamps: true,
    toRecord: (k) => k,
    toDrizzle: (k) => k,
  },
  currency_exchange_rates: {
    delegate: 'currency_exchange_rates',
    softDelete: false,
    hasTimestamps: false,
    toRecord: (e) => e,
    toDrizzle: (e) => e,
  },
  competitor_insights: {
    delegate: 'competitor_insights',
    softDelete: false,
    hasTimestamps: true,
    toRecord: (c) => c,
    toDrizzle: (c) => c,
  },
  pending_inventory_updates: {
    delegate: 'pending_inventory_updates',
    softDelete: false,
    hasTimestamps: true,
    toRecord: (u) => u,
    toDrizzle: (u) => u,
  },
  townships: {
    delegate: 'townships',
    softDelete: false,
    hasTimestamps: true,
    toRecord: (t) => t,
    toDrizzle: (t) => t,
  },
  wards: {
    delegate: 'wards',
    softDelete: false,
    hasTimestamps: true,
    toRecord: (w) => w,
    toDrizzle: (w) => w,
  },
  audit_events: {
    delegate: 'audit_events',
    softDelete: false,
    hasTimestamps: false,
    toRecord: (r) => ({
      ...r,
      previous_state:
        typeof r.previous_state === 'string'
          ? r.previous_state
          : JSON.stringify(r.previous_state),
      new_state:
        typeof r.new_state === 'string'
          ? r.new_state
          : JSON.stringify(r.new_state),
    }),
    toDrizzle: (r) => ({
      ...r,
      previous_state:
        typeof r.previous_state === 'string' && r.previous_state
          ? JSON.parse(r.previous_state)
          : r.previous_state,
      new_state:
        typeof r.new_state === 'string' && r.new_state
          ? JSON.parse(r.new_state)
          : r.new_state,
    }),
  },
  expected_inbounds: {
    delegate: 'expected_inbounds',
    softDelete: false,
    hasTimestamps: true,
    toRecord: (r) => r,
    toDrizzle: (r) => r,
  },
};
