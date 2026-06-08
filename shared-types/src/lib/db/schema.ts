import {
  pgTable,
  text,
  integer,
  boolean,
  doublePrecision,
  bigint,
  index,
  jsonb,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const regions = pgTable(
  'regions',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    division: text('division').notNull(),
    created_at: bigint('created_at', { mode: 'number' }).notNull(),
    updated_at: bigint('updated_at', { mode: 'number' }).notNull(),
    deleted_at: bigint('deleted_at', { mode: 'number' }),
  },
  (table) => ({
    nameIdx: index('regions_name_idx').on(table.name),
  }),
);

export const shops = pgTable(
  'shops',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    address: text('address').notNull(),
    latitude: doublePrecision('latitude'),
    longitude: doublePrecision('longitude'),
    region_id: text('region_id').notNull(),
    township_id: text('township_id'),
    ward_id: text('ward_id'),
    assigned_rep_id: text('assigned_rep_id'),
    lifetime_value: doublePrecision('lifetime_value').notNull().default(0),
    sentiment_trend: text('sentiment_trend').notNull().default('STABLE'),
    price_book_id: text('price_book_id'),
    price_tier: text('price_tier').notNull().default('Retailer'),
    created_at: bigint('created_at', { mode: 'number' }).notNull(),
    updated_at: bigint('updated_at', { mode: 'number' }).notNull(),
    deleted_at: bigint('deleted_at', { mode: 'number' }),
  },
  (table) => ({
    nameIdx: index('shops_name_idx').on(table.name),
    regionIdIdx: index('shops_region_id_idx').on(table.region_id),
    assignedRepIdIdx: index('shops_assigned_rep_id_idx').on(
      table.assigned_rep_id,
    ),
  }),
);

export const contacts = pgTable(
  'contacts',
  {
    id: text('id').primaryKey(),
    shop_id: text('shop_id').notNull(),
    name: text('name').notNull(),
    phone_number: text('phone_number').notNull(),
    email: text('email'),
    is_primary: boolean('is_primary').notNull().default(false),
    created_at: bigint('created_at', { mode: 'number' }).notNull(),
    updated_at: bigint('updated_at', { mode: 'number' }).notNull(),
    deleted_at: bigint('deleted_at', { mode: 'number' }),
  },
  (table) => ({
    shopIdIdx: index('contacts_shop_id_idx').on(table.shop_id),
  }),
);

export const items = pgTable(
  'items',
  {
    id: text('id').primaryKey(),
    sku: text('sku').notNull(),
    name: text('name').notNull(),
    unit_price: doublePrecision('unit_price').notNull(),
    category: text('category').notNull(),
    brand_id: text('brand_id'),
    thickness: text('thickness'),
    weight: text('weight'),
    unit_type: text('unit_type').notNull().default('PCS'),
    conversion_factor: doublePrecision('conversion_factor')
      .notNull()
      .default(1),
    color: text('color'),
    material_sub_type: text('material_sub_type'),
    hardware_finish: text('hardware_finish'),
    is_in_deficit: boolean('is_in_deficit').notNull().default(false),
    base_wholesale_price: doublePrecision('base_wholesale_price'),
    base_currency: text('base_currency'),
    volume_discount_brackets: text('volume_discount_brackets'),
    created_at: bigint('created_at', { mode: 'number' }).notNull(),
    updated_at: bigint('updated_at', { mode: 'number' }).notNull(),
    deleted_at: bigint('deleted_at', { mode: 'number' }),
    inventory_status: text('inventory_status').notNull().default('AVAILABLE'),
  },
  (table) => ({
    skuIdx: index('items_sku_idx').on(table.sku),
  }),
);

export const item_stocks = pgTable(
  'item_stocks',
  {
    id: text('id').primaryKey(),
    item_id: text('item_id').notNull(),
    quantity: integer('quantity').notNull().default(0),
    pending_allocation_count: integer('pending_allocation_count')
      .notNull()
      .default(0),
    created_at: bigint('created_at', { mode: 'number' }).notNull(),
    updated_at: bigint('updated_at', { mode: 'number' }).notNull(),
    deleted_at: bigint('deleted_at', { mode: 'number' }),
    inventory_status: text('inventory_status').notNull().default('AVAILABLE'),
  },
  (table) => ({
    itemIdIdx: index('item_stocks_item_id_idx').on(table.item_id),
  }),
);

export const interaction_logs = pgTable(
  'interaction_logs',
  {
    id: text('id').primaryKey(),
    shop_id: text('shop_id').notNull(),
    rep_id: text('rep_id').notNull(),
    project_id: text('project_id'),
    type: text('type').notNull(),
    commercial_status: text('commercial_status').notNull(),
    notes: text('notes').notNull(),
    next_follow_up_date: bigint('next_follow_up_date', { mode: 'number' }),
    viber_screenshot_url: text('viber_screenshot_url'),
    created_at_local: bigint('created_at_local', { mode: 'number' }).notNull(),
    synced_at_server: bigint('synced_at_server', { mode: 'number' }),
    is_offline_entry: boolean('is_offline_entry').notNull().default(false),
    device_id: text('device_id').notNull(),
    created_at: bigint('created_at', { mode: 'number' }).notNull(),
    updated_at: bigint('updated_at', { mode: 'number' }).notNull(),
    deleted_at: bigint('deleted_at', { mode: 'number' }),
    ai_verification_status: text('ai_verification_status'),
    ai_verification_notes: text('ai_verification_notes'),
    executed_by_id: text('executed_by_id'),
    salesperson_id: text('salesperson_id'),
    approved_by_id: text('approved_by_id'),
    // Delivery lifecycle fields (Sprint 35)
    assigned_driver_id: text('assigned_driver_id'),
    dispatched_at: bigint('dispatched_at', { mode: 'number' }),
    pod_image_url: text('pod_image_url'),
  },
  (table) => ({
    shopIdIdx: index('interaction_logs_shop_id_idx').on(table.shop_id),
    repIdIdx: index('interaction_logs_rep_id_idx').on(table.rep_id),
  }),
);

export const interaction_items = pgTable(
  'interaction_items',
  {
    id: text('id').primaryKey(),
    interaction_log_id: text('interaction_log_id').notNull(),
    item_id: text('item_id').notNull(),
    quantity: integer('quantity').notNull().default(1),
    unit_price_at_sale: doublePrecision('unit_price_at_sale').notNull(),
    interest_level: text('interest_level'),
    unit_price: doublePrecision('unit_price'),
    selected_currency: text('selected_currency').notNull().default('MMK'),
    selected_unit: text('selected_unit').notNull().default('PCS'),
    stock_condition: text('stock_condition').notNull().default('GOOD'),
    pending_allocation_count: integer('pending_allocation_count')
      .notNull()
      .default(0),
    fulfillment_status: text('fulfillment_status')
      .notNull()
      .default('PENDING_FULFILLMENT'),
    compliance_status: text('compliance_status').notNull().default('APPROVED'),
    created_at: bigint('created_at', { mode: 'number' }).notNull(),
    updated_at: bigint('updated_at', { mode: 'number' }).notNull(),
    deleted_at: bigint('deleted_at', { mode: 'number' }),
  },
  (table) => ({
    logIdIdx: index('interaction_items_log_id_idx').on(
      table.interaction_log_id,
    ),
    itemIdIdx: index('interaction_items_item_id_idx').on(table.item_id),
  }),
);

export const daily_quotas = pgTable(
  'daily_quotas',
  {
    id: text('id').primaryKey(),
    user_id: text('user_id').notNull(),
    target_visits: integer('target_visits').notNull().default(0),
    target_phone: integer('target_phone').notNull().default(0),
    target_viber: integer('target_viber').notNull().default(0),
    effective_from: bigint('effective_from', { mode: 'number' }).notNull(),
    created_at: bigint('created_at', { mode: 'number' }).notNull(),
    updated_at: bigint('updated_at', { mode: 'number' }).notNull(),
    deleted_at: bigint('deleted_at', { mode: 'number' }),
  },
  (table) => ({
    userIdIdx: index('daily_quotas_user_id_idx').on(table.user_id),
  }),
);

export const planned_routes = pgTable(
  'planned_routes',
  {
    id: text('id').primaryKey(),
    rep_id: text('rep_id').notNull(),
    date: text('date').notNull(),
    shop_ids: text('shop_ids').notNull(),
    created_at: bigint('created_at', { mode: 'number' }).notNull(),
    updated_at: bigint('updated_at', { mode: 'number' }).notNull(),
  },
  (table) => ({
    repIdIdx: index('planned_routes_rep_id_idx').on(table.rep_id),
  }),
);

export const check_in_logs = pgTable(
  'check_in_logs',
  {
    id: text('id').primaryKey(),
    shop_id: text('shop_id').notNull(),
    rep_id: text('rep_id').notNull(),
    check_in_time: bigint('check_in_time', { mode: 'number' }).notNull(),
    latitude: doublePrecision('latitude').notNull(),
    longitude: doublePrecision('longitude').notNull(),
    verified: boolean('verified').notNull().default(false),
    created_at: bigint('created_at', { mode: 'number' }).notNull(),
    updated_at: bigint('updated_at', { mode: 'number' }).notNull(),
  },
  (table) => ({
    shopIdIdx: index('check_in_logs_shop_id_idx').on(table.shop_id),
    repIdIdx: index('check_in_logs_rep_id_idx').on(table.rep_id),
  }),
);

export const prediction_logs = pgTable(
  'prediction_logs',
  {
    id: text('id').primaryKey(),
    shop_id: text('shop_id').notNull(),
    predicted_ltv: doublePrecision('predicted_ltv').notNull().default(0),
    churn_risk: doublePrecision('churn_risk').notNull().default(0),
    stockout_risk: doublePrecision('stockout_risk').notNull().default(0),
    created_at: bigint('created_at', { mode: 'number' }).notNull(),
    updated_at: bigint('updated_at', { mode: 'number' }).notNull(),
  },
  (table) => ({
    shopIdIdx: index('prediction_logs_shop_id_idx').on(table.shop_id),
  }),
);

export const recommended_orders = pgTable(
  'recommended_orders',
  {
    id: text('id').primaryKey(),
    shop_id: text('shop_id').notNull(),
    item_id: text('item_id').notNull(),
    quantity: integer('quantity').notNull().default(0),
    confidence: doublePrecision('confidence').notNull().default(0),
    created_at: bigint('created_at', { mode: 'number' }).notNull(),
    updated_at: bigint('updated_at', { mode: 'number' }).notNull(),
  },
  (table) => ({
    shopIdIdx: index('recommended_orders_shop_id_idx').on(table.shop_id),
    itemIdIdx: index('recommended_orders_item_id_idx').on(table.item_id),
  }),
);

export const price_books = pgTable(
  'price_books',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    region_id: text('region_id'),
    created_at: bigint('created_at', { mode: 'number' }).notNull(),
    updated_at: bigint('updated_at', { mode: 'number' }).notNull(),
  },
  (table) => ({
    regionIdIdx: index('price_books_region_id_idx').on(table.region_id),
  }),
);

export const price_book_items = pgTable(
  'price_book_items',
  {
    id: text('id').primaryKey(),
    price_book_id: text('price_book_id').notNull(),
    item_id: text('item_id').notNull(),
    price: doublePrecision('price').notNull(),
    currency: text('currency').notNull().default('MMK'),
    created_at: bigint('created_at', { mode: 'number' }).notNull(),
    updated_at: bigint('updated_at', { mode: 'number' }).notNull(),
  },
  (table) => ({
    bookIdIdx: index('price_book_items_book_id_idx').on(table.price_book_id),
    itemIdIdx: index('price_book_items_item_id_idx').on(table.item_id),
  }),
);

export const exchange_rates = pgTable('exchange_rates', {
  id: text('id').primaryKey(),
  from_currency: text('from_currency').notNull(),
  to_currency: text('to_currency').notNull(),
  rate: doublePrecision('rate').notNull(),
  updated_at: bigint('updated_at', { mode: 'number' }).notNull(),
});

export const rep_scores = pgTable(
  'rep_scores',
  {
    id: text('id').primaryKey(),
    rep_id: text('rep_id').notNull(),
    points: integer('points').notNull().default(0),
    streak_days: integer('streak_days').notNull().default(0),
    badges: text('badges').notNull().default('[]'),
    created_at: bigint('created_at', { mode: 'number' }).notNull(),
    updated_at: bigint('updated_at', { mode: 'number' }).notNull(),
  },
  (table) => ({
    repIdIdx: index('rep_scores_rep_id_idx').on(table.rep_id),
  }),
);

export const points_logs = pgTable(
  'points_logs',
  {
    id: text('id').primaryKey(),
    rep_id: text('rep_id').notNull(),
    points_added: integer('points_added').notNull(),
    reason: text('reason').notNull(),
    created_at: bigint('created_at', { mode: 'number' }).notNull(),
  },
  (table) => ({
    repIdIdx: index('points_logs_rep_id_idx').on(table.rep_id),
  }),
);

export const brands = pgTable(
  'brands',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    created_at: bigint('created_at', { mode: 'number' }).notNull(),
    updated_at: bigint('updated_at', { mode: 'number' }).notNull(),
    deleted_at: bigint('deleted_at', { mode: 'number' }),
  },
  (table) => ({
    nameIdx: index('brands_name_idx').on(table.name),
  }),
);

export const stock_locations = pgTable(
  'stock_locations',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    created_at: bigint('created_at', { mode: 'number' }).notNull(),
    updated_at: bigint('updated_at', { mode: 'number' }).notNull(),
    deleted_at: bigint('deleted_at', { mode: 'number' }),
  },
  (table) => ({
    nameIdx: index('stock_locations_name_idx').on(table.name),
  }),
);

export const stock_balances = pgTable(
  'stock_balances',
  {
    id: text('id').primaryKey(),
    item_id: text('item_id').notNull(),
    location_id: text('location_id').notNull(),
    quantity: integer('quantity').notNull().default(0),
    created_at: bigint('created_at', { mode: 'number' }).notNull(),
    updated_at: bigint('updated_at', { mode: 'number' }).notNull(),
    deleted_at: bigint('deleted_at', { mode: 'number' }),
  },
  (table) => ({
    itemIdIdx: index('stock_balances_item_id_idx').on(table.item_id),
    locationIdIdx: index('stock_balances_location_id_idx').on(
      table.location_id,
    ),
  }),
);

export const projects = pgTable(
  'projects',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    created_at: bigint('created_at', { mode: 'number' }).notNull(),
    updated_at: bigint('updated_at', { mode: 'number' }).notNull(),
    deleted_at: bigint('deleted_at', { mode: 'number' }),
  },
  (table) => ({
    nameIdx: index('projects_name_idx').on(table.name),
  }),
);

export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey(),
    username: text('username').notNull(),
    password: text('password').notNull(),
    role: text('role').notNull().default('sales'),
    region_id: text('region_id'),
    created_at: bigint('created_at', { mode: 'number' }).notNull(),
    updated_at: bigint('updated_at', { mode: 'number' }).notNull(),
  },
  (table) => ({
    usernameIdx: index('users_username_idx').on(table.username),
  }),
);

export const sync_audit_logs = pgTable('sync_audit_logs', {
  id: text('id').primaryKey(),
  device_id: text('device_id').notNull(),
  user_id: text('user_id'),
  action: text('action').notNull(),
  records_pulled: integer('records_pulled').notNull().default(0),
  records_pushed: integer('records_pushed').notNull().default(0),
  status: text('status').notNull(),
  error_message: text('error_message'),
  created_at: bigint('created_at', { mode: 'number' }).notNull(),
});

export const idempotency_keys = pgTable('idempotency_keys', {
  key: text('key').primaryKey(),
  response_body: text('response_body').notNull(),
  created_at: bigint('created_at', { mode: 'number' }).notNull(),
});

export const telemetry_logs = pgTable('telemetry_logs', {
  id: text('id').primaryKey(),
  level: text('level').notNull(),
  event_type: text('event_type').notNull(),
  message: text('message').notNull(),
  timestamp: bigint('timestamp', { mode: 'number' }).notNull(),
  synced_at_server: bigint('synced_at_server', { mode: 'number' }),
  thermal_status: text('thermal_status'),
  network_generation_2G_EDGE: text('network_generation_2G_EDGE'),
  created_at: bigint('created_at', { mode: 'number' }).notNull(),
  updated_at: bigint('updated_at', { mode: 'number' }).notNull(),
});

export const rep_kpis = pgTable(
  'rep_kpis',
  {
    id: text('id').primaryKey(),
    rep_id: text('rep_id').notNull(),
    date: text('date').notNull(),
    sales_volume: doublePrecision('sales_volume').notNull().default(0),
    sales_target: doublePrecision('sales_target').notNull().default(0),
    visits_count: integer('visits_count').notNull().default(0),
    visits_target: integer('visits_target').notNull().default(0),
    created_at: bigint('created_at', { mode: 'number' }).notNull(),
    updated_at: bigint('updated_at', { mode: 'number' }).notNull(),
    deleted_at: bigint('deleted_at', { mode: 'number' }),
  },
  (table) => ({
    repIdIdx: index('rep_kpis_rep_id_idx').on(table.rep_id),
  }),
);

export const projectsRelations = relations(projects, ({ many }) => ({
  orders: many(interaction_logs),
}));

export const interactionLogsRelations = relations(
  interaction_logs,
  ({ one }) => ({
    project: one(projects, {
      fields: [interaction_logs.project_id],
      references: [projects.id],
    }),
  }),
);

export const currency_exchange_rates = pgTable('currency_exchange_rates', {
  id: text('id').primaryKey(),
  currency: text('currency').notNull(),
  rate_to_kyat: doublePrecision('rate_to_kyat').notNull(),
  pushed_at: bigint('pushed_at', { mode: 'number' }).notNull(),
});

export const competitor_insights = pgTable('competitor_insights', {
  id: text('id').primaryKey(),
  product_name: text('product_name').notNull(),
  street_price: doublePrecision('street_price').notNull(),
  photo_url: text('photo_url'),
  created_at: bigint('created_at', { mode: 'number' }).notNull(),
  updated_at: bigint('updated_at', { mode: 'number' }).notNull(),
});

export const pending_inventory_updates = pgTable('pending_inventory_updates', {
  id: text('id').primaryKey(),
  type: text('type').notNull(), // 'STOCK_ADJUSTMENT' or 'NEW_SKU'
  item_id: text('item_id'), // null for new SKU
  location_id: text('location_id').notNull(),
  quantity_delta: integer('quantity_delta'), // delta for adjustment, or initial stock for new SKU
  sku: text('sku'),
  name: text('name'),
  unit_price: doublePrecision('unit_price'),
  category: text('category'),
  submitted_by: text('submitted_by').notNull(),
  status: text('status').notNull().default('PENDING'), // 'PENDING', 'APPROVED', 'REJECTED'
  created_at: bigint('created_at', { mode: 'number' }).notNull(),
  updated_at: bigint('updated_at', { mode: 'number' }).notNull(),
});

export const townships = pgTable(
  'townships',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    region_id: text('region_id').notNull(),
    created_at: bigint('created_at', { mode: 'number' }).notNull(),
    updated_at: bigint('updated_at', { mode: 'number' }).notNull(),
  },
  (table) => ({
    regionIdIdx: index('townships_region_id_idx').on(table.region_id),
  }),
);

export const wards = pgTable(
  'wards',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    township_id: text('township_id').notNull(),
    created_at: bigint('created_at', { mode: 'number' }).notNull(),
    updated_at: bigint('updated_at', { mode: 'number' }).notNull(),
  },
  (table) => ({
    townshipIdIdx: index('wards_township_id_idx').on(table.township_id),
  }),
);

export const audit_events = pgTable('audit_events', {
  event_id: text('event_id').primaryKey(),
  trace_id: text('trace_id'),
  actor_id: text('actor_id'), // UUID string
  device_id: text('device_id'), // UUID string
  entity_type: text('entity_type').notNull(), // 'ORDER', 'SHOP', 'INVENTORY'
  action: text('action').notNull(), // 'CREATE', 'UPDATE', 'DELETE', 'OVERRIDE'
  previous_state: jsonb('previous_state'),
  new_state: jsonb('new_state'),
  gps_coordinates: text('gps_coordinates'),
  hash: text('hash'),
  status: text('status').notNull().default('VALID'),
  created_at: bigint('created_at', { mode: 'number' }).notNull(),
  shop_id: text('shop_id'),
  executed_by_id: text('executed_by_id'),
  salesperson_id: text('salesperson_id'),
  approved_by_id: text('approved_by_id'),
});

export const expected_inbounds = pgTable('expected_inbounds', {
  id: text('id').primaryKey(),
  sku: text('sku').notNull(),
  expected_quantity: integer('expected_quantity').notNull(),
  origin: text('origin').notNull().default('Thailand'),
  estimated_arrival_date: text('estimated_arrival_date').notNull(),
  created_at: bigint('created_at', { mode: 'number' }).notNull(),
  updated_at: bigint('updated_at', { mode: 'number' }).notNull(),
});

// ─── Accounts Receivable (Sprint 35) ──────────────────────────────────────────

export const invoices = pgTable(
  'invoices',
  {
    id: text('id').primaryKey(),
    shop_id: text('shop_id').notNull(),
    interaction_log_id: text('interaction_log_id'),
    amount: doublePrecision('amount').notNull(),
    due_date: bigint('due_date', { mode: 'number' }).notNull(),
    grace_period_days: integer('grace_period_days').notNull().default(7),
    // PENDING | PARTIALLY_PAID | PAID | OVERDUE | WRITTEN_OFF
    state: text('state').notNull().default('PENDING'),
    created_at: bigint('created_at', { mode: 'number' }).notNull(),
    updated_at: bigint('updated_at', { mode: 'number' }).notNull(),
  },
  (table) => ({
    shopIdIdx: index('invoices_shop_id_idx').on(table.shop_id),
    logIdIdx: index('invoices_log_id_idx').on(table.interaction_log_id),
  }),
);

export const payments = pgTable(
  'payments',
  {
    id: text('id').primaryKey(),
    invoice_id: text('invoice_id').notNull(),
    amount: doublePrecision('amount').notNull(),
    payment_date: bigint('payment_date', { mode: 'number' }).notNull(),
    transaction_ref: text('transaction_ref'),
    screenshot_url: text('screenshot_url'),
    reconciled_by: text('reconciled_by'),
    created_at: bigint('created_at', { mode: 'number' }).notNull(),
    updated_at: bigint('updated_at', { mode: 'number' }).notNull(),
  },
  (table) => ({
    invoiceIdIdx: index('payments_invoice_id_idx').on(table.invoice_id),
  }),
);
