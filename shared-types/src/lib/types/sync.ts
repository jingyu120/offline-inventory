// ─── Sync Protocol Types ────────────────────────────────────────────
// Transport-level shapes for the offline-first pull/push synchronization
// protocol between the client (SQLite) and the sync-server (PostgreSQL).

/** Generic sync change-set for a single table. */
export interface WatermelonChangeSet<T> {
  created: T[];
  updated: T[];
  deleted: string[];
}

/** Table name union — matches local DB table names exactly. */
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
  | 'expected_inbounds'
  | 'invoices'
  | 'payments';

/** Full pull-response payload returned by sync-server. */
export interface PullChangesResponse {
  changes: Record<SyncTableName, WatermelonChangeSet<unknown>>;
  timestamp: number;
}

/** Push-request body sent by the frontend. */
export interface PushChangesBody {
  changes: Partial<Record<SyncTableName, WatermelonChangeSet<unknown>>>;
}
